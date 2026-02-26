import "./polyfill.js";
import { Creem as CreemSDK } from "creem";
import type {
  CheckoutEntity,
  CustomerEntity,
  ProductEntity,
  SubscriptionEntity,
} from "creem/models/components";
import {
  subscriptionEntityFromJSON,
  checkoutEntityFromJSON,
  productEntityFromJSON,
} from "creem/models/components";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import {
  type FunctionReference,
  type HttpRouter,
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
} from "convex/server";
import { type Infer, v } from "convex/values";
import schema from "../component/schema.js";
import {
  type RunMutationCtx,
  type RunQueryCtx,
  convertToDatabaseProduct,
  convertToDatabaseSubscription,
  convertToOrder,
  type RunActionCtx,
} from "../component/util.js";
import type { ComponentApi } from "../component/_generated/component.js";
import { resolveBillingSnapshot as defaultResolveBillingSnapshot } from "../core/resolver.js";
import type {
  BillingSnapshot,
  PaymentSnapshot,
  SubscriptionSnapshot,
} from "../core/types.js";

export * from "../core/index.js";

export const subscriptionValidator = schema.tables.subscriptions.validator;
export type Subscription = Infer<typeof subscriptionValidator>;

export type SubscriptionHandler = FunctionReference<
  "mutation",
  "internal",
  { subscription: Subscription }
>;

export type CreemWebhookEvent = {
  type?: string;
  eventType?: string;
  data?: unknown;
  object?: unknown;
};

export type WebhookEventHandlers = Record<
  string,
  (ctx: RunMutationCtx, event: CreemWebhookEvent) => Promise<void> | void
>;

export type ApiResolver = (ctx: RunQueryCtx) => Promise<{
  userId: string;
  email: string;
  entityId: string;
}>;

type CreemConfig = {
  /** Default cancel mode for subscriptions. Omit to use Creem's store-level default. */
  cancelMode?: "immediate" | "scheduled";
  apiKey?: string;
  webhookSecret?: string;
  serverIdx?: number;
  serverURL?: string;
};

const getEntityId = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") {
      return id;
    }
  }
  return null;
};

const lowerCaseHeaders = (headers: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const normalizeSignature = (signature: string) => {
  const trimmed = signature.trim();
  if (trimmed.startsWith("sha256=")) {
    return trimmed.slice("sha256=".length).toLowerCase();
  }
  return trimmed.toLowerCase();
};

export class Creem {
  public sdk: CreemSDK;
  private apiKey: string;
  private webhookSecret: string;
  private serverIdx?: number;
  private serverURL?: string;

  constructor(
    public component: ComponentApi,
    private config: CreemConfig = {},
  ) {
    this.apiKey = config.apiKey ?? process.env["CREEM_API_KEY"] ?? "";
    this.webhookSecret =
      config.webhookSecret ?? process.env["CREEM_WEBHOOK_SECRET"] ?? "";
    this.serverIdx =
      config.serverIdx ??
      (process.env["CREEM_SERVER_IDX"]
        ? Number(process.env["CREEM_SERVER_IDX"])
        : undefined);
    this.serverURL = config.serverURL ?? process.env["CREEM_SERVER_URL"];

    this.sdk = new CreemSDK({
      apiKey: this.apiKey,
      ...(this.serverIdx !== undefined ? { serverIdx: this.serverIdx } : {}),
      ...(this.serverURL ? { serverURL: this.serverURL } : {}),
    });
  }
  private getCustomerByEntityId(ctx: RunQueryCtx, entityId: string) {
    return ctx.runQuery(this.component.lib.getCustomerByEntityId, { entityId });
  }

  async syncProducts(ctx: RunActionCtx) {
    await ctx.runAction(this.component.lib.syncProducts, {
      apiKey: this.apiKey,
      serverIdx: this.serverIdx,
      serverURL: this.serverURL,
    });
  }

  private async createCheckoutSession(
    ctx: RunMutationCtx,
    {
      productId,
      entityId,
      userId,
      email,
      successUrl,
      units,
      metadata,
    }: {
      productId: string;
      entityId: string;
      userId: string;
      email: string;
      successUrl?: string;
      units?: number;
      metadata?: Record<string, string>;
    },
  ): Promise<CheckoutEntity> {
    const dbCustomer = await ctx.runQuery(
      this.component.lib.getCustomerByEntityId,
      {
        entityId,
      },
    );

    const checkout = await this.sdk.checkouts.create({
      productId,
      ...(successUrl ? { successUrl } : {}),
      units,
      metadata: {
        ...(metadata ?? {}),
        convexUserId: userId,
        convexBillingEntityId: entityId,
      },
      customer: dbCustomer ? { id: dbCustomer.id } : { email },
    });

    if (!dbCustomer) {
      const customerId = getEntityId(checkout.customer);
      if (customerId) {
        const customerObj =
          typeof checkout.customer === "object" ? checkout.customer : undefined;
        await ctx.runMutation(this.component.lib.insertCustomer, {
          id: customerId,
          entityId,
          email: customerObj?.email,
          name: customerObj?.name ?? undefined,
          country: customerObj?.country,
          mode: customerObj?.mode,
        });
      }
    }

    return checkout;
  }

  private async createCustomerPortalSession(
    ctx: RunActionCtx,
    { entityId }: { entityId: string },
  ) {
    const customer = await ctx.runQuery(
      this.component.lib.getCustomerByEntityId,
      { entityId },
    );

    if (!customer) {
      throw new Error("Customer not found");
    }

    const portal = await this.sdk.customers.generateBillingLinks({
      customerId: customer.id,
    });
    return { url: portal.customerPortalLink };
  }

  private listProducts(
    ctx: RunQueryCtx,
    { includeArchived }: { includeArchived?: boolean } = {},
  ) {
    return ctx.runQuery(this.component.lib.listProducts, {
      includeArchived,
    });
  }
  private async getCurrentSubscription(
    ctx: RunQueryCtx,
    { entityId }: { entityId: string },
  ) {
    const subscription = await ctx.runQuery(
      this.component.lib.getCurrentSubscription,
      {
        entityId,
      },
    );
    if (!subscription) {
      return null;
    }
    const product = await ctx.runQuery(this.component.lib.getProduct, {
      id: subscription.productId,
    });
    if (!product) {
      throw new Error("Product not found");
    }
    return {
      ...subscription,
      product,
    };
  }
  /** Return active subscriptions for an entity, excluding ended and expired trials. */
  private listUserSubscriptions(ctx: RunQueryCtx, { entityId }: { entityId: string }) {
    return ctx.runQuery(this.component.lib.listUserSubscriptions, {
      entityId,
    });
  }
  /** Return paid one-time orders for an entity. */
  private listUserOrders(ctx: RunQueryCtx, { entityId }: { entityId: string }) {
    return ctx.runQuery(this.component.lib.listUserOrders, {
      entityId,
    });
  }
  /** Return all subscriptions for an entity, including ended and expired trials. */
  private listAllUserSubscriptions(ctx: RunQueryCtx, { entityId }: { entityId: string }) {
    return ctx.runQuery(this.component.lib.listAllUserSubscriptions, {
      entityId,
    });
  }
  private getProduct(ctx: RunQueryCtx, { productId }: { productId: string }) {
    return ctx.runQuery(this.component.lib.getProduct, { id: productId });
  }
  private async changeSubscription(
    ctx: RunActionCtx,
    { entityId, productId, updateBehavior }: { entityId: string; productId: string; updateBehavior?: "proration-charge-immediately" | "proration-charge" | "proration-none" },
  ) {
    const subscription = await this.getCurrentSubscription(ctx, { entityId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (subscription.productId === productId) {
      throw new Error("Subscription already on this product");
    }
    const updatedSubscription = await this.sdk.subscriptions.upgrade(
      subscription.id,
      {
        productId,
        ...(updateBehavior ? { updateBehavior } : {}),
      },
    );
    return updatedSubscription;
  }

  private async updateSubscriptionSeats(
    ctx: RunActionCtx,
    { entityId, units, subscriptionId, updateBehavior }: { entityId: string; units: number; subscriptionId?: string; updateBehavior?: "proration-charge-immediately" | "proration-charge" | "proration-none" },
  ) {
    if (units < 1) {
      throw new Error("Units must be at least 1");
    }
    let subscription;
    if (subscriptionId) {
      const sub = await ctx.runQuery(this.component.lib.getSubscription, { id: subscriptionId });
      if (!sub) throw new Error(`Subscription not found: ${subscriptionId}`);
      const product = await ctx.runQuery(this.component.lib.getProduct, { id: sub.productId });
      if (!product) throw new Error("Product not found");
      subscription = { ...sub, product };
    } else {
      subscription = await this.getCurrentSubscription(ctx, { entityId });
      if (!subscription) throw new Error("Subscription not found");
    }
    console.log(`[creem-seats] targeting sub=${subscription.id} product=${subscription.productId} currentSeats=${subscription.seats} → newUnits=${units}`);
    // Fetch live subscription from Creem to get item IDs
    const live = await this.sdk.subscriptions.get(subscription.id);
    const item = live.items?.[0];
    if (!item) {
      throw new Error("Subscription has no items");
    }
    console.log(`[creem-seats] item=${item.id} productId=${item.productId} priceId=${item.priceId}`);
    // Note: The Creem SDK defaults updateBehavior to "proration-charge" which defers
    // seat changes to the next billing cycle. Callers should explicitly pass
    // "proration-charge-immediately" for changes to take effect right away.
    console.log(`[creem-seats] sending update: items=[{id: ${item.id}, productId: ${item.productId}, priceId: ${item.priceId}, units: ${units}}] updateBehavior=${updateBehavior ?? "(sdk-default: proration-charge)"}`);
    const updatedSubscription = await this.sdk.subscriptions.update(
      subscription.id,
      {
        items: [{ id: item.id, productId: item.productId, priceId: item.priceId, units }],
        ...(updateBehavior ? { updateBehavior } : {}),
      },
    );
    const responseItems = updatedSubscription.items?.map(i => ({ id: i.id, units: i.units }));
    console.log(`[creem-seats] API response: status=${updatedSubscription.status} items=${JSON.stringify(responseItems)}`);
    return updatedSubscription;
  }

  private toSubscriptionSnapshot(
    subscription: Subscription,
  ): SubscriptionSnapshot {
    return {
      id: subscription.id,
      productId: subscription.productId,
      status: subscription.status,
      recurringInterval: subscription.recurringInterval,
      seats: subscription.seats,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd ?? null,
    };
  }

  async getBillingSnapshot(
    ctx: RunQueryCtx,
    {
      entityId,
      payment,
    }: {
      entityId: string;
      payment?: PaymentSnapshot | null;
    },
  ): Promise<BillingSnapshot> {
    const [currentSubscription, allSubscriptions] =
      await Promise.all([
        this.getCurrentSubscription(ctx, { entityId }),
        this.listAllUserSubscriptions(ctx, { entityId }),
      ]);

    return defaultResolveBillingSnapshot({
      currentSubscription: currentSubscription
        ? this.toSubscriptionSnapshot(currentSubscription)
        : null,
      allSubscriptions: allSubscriptions.map((subscription) =>
        this.toSubscriptionSnapshot(subscription),
      ),
      payment: payment ?? null,
      userContext: undefined,
    });
  }

  /** Cancel an active or trialing subscription.
   *  Uses `config.cancelMode` as default when `revokeImmediately` is not specified.
   *  When neither is set, omits the mode so Creem's store-level default applies. */
  private async cancelSubscription(
    ctx: RunActionCtx,
    { entityId, revokeImmediately }: { entityId: string; revokeImmediately?: boolean },
  ) {
    const subscription = await this.getCurrentSubscription(ctx, { entityId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      throw new Error("Subscription is not active");
    }
    // Resolve cancel mode: explicit arg > config default > omit (Creem decides)
    const immediate =
      revokeImmediately ??
      (this.config.cancelMode === "immediate" ? true : undefined);
    const cancelParams =
      immediate === true
        ? { mode: "immediate" as const }
        : immediate === false || this.config.cancelMode === "scheduled"
          ? { mode: "scheduled" as const, onExecute: "cancel" as const }
          : {};
    console.log(
      `[creem-cancel] subId=${subscription.id} status=${subscription.status} cancelParams=${JSON.stringify(cancelParams)}`,
    );
    const updatedSubscription = await this.sdk.subscriptions.cancel(
      subscription.id,
      cancelParams,
    );
    console.log(
      `[creem-cancel] response status=${(updatedSubscription as unknown as Record<string, unknown>)?.status}`,
    );
    return updatedSubscription;
  }

  /** Pause an active subscription. */
  private async pauseSubscription(ctx: RunActionCtx, { entityId }: { entityId: string }) {
    const subscription = await this.getCurrentSubscription(ctx, { entityId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      throw new Error("Subscription is not active");
    }
    return await this.sdk.subscriptions.pause(subscription.id);
  }

  /** Resume a subscription that is in scheduled_cancel or paused state. */
  private async resumeSubscription(ctx: RunActionCtx, { entityId }: { entityId: string }) {
    const subscription = await this.getCurrentSubscription(ctx, { entityId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (
      subscription.status !== "scheduled_cancel" &&
      subscription.status !== "paused"
    ) {
      throw new Error("Subscription is not in a resumable state");
    }
    return await this.sdk.subscriptions.resume(subscription.id);
  }

  private async verifyWebhook(body: string, headers: Record<string, string>) {
    if (!this.webhookSecret) {
      throw new Error("Missing CREEM_WEBHOOK_SECRET");
    }

    const normalized = lowerCaseHeaders(headers);
    const webhookId = normalized["webhook-id"];
    const webhookTimestamp = normalized["webhook-timestamp"];
    const webhookSignature = normalized["webhook-signature"];

    if (webhookId && webhookTimestamp && webhookSignature) {
      new Webhook(this.webhookSecret).verify(body, {
        "webhook-id": webhookId,
        "webhook-timestamp": webhookTimestamp,
        "webhook-signature": webhookSignature,
      });
      return;
    }

    const creemSignature =
      normalized["creem-signature"] ?? normalized["x-creem-signature"];
    if (!creemSignature) {
      throw new WebhookVerificationError("Missing webhook signature");
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body),
    );
    const expected = toHex(new Uint8Array(digest));
    if (!constantTimeEqual(normalizeSignature(creemSignature), expected)) {
      throw new WebhookVerificationError("Invalid webhook signature");
    }
  }

  private getEventType(event: CreemWebhookEvent) {
    return event.type ?? event.eventType ?? "";
  }

  private getEventData(event: CreemWebhookEvent) {
    return event.data ?? event.object;
  }

  /**
   * Parse raw snake_case webhook object into a typed SubscriptionEntity
   * using the SDK's built-in parser (handles snake_case → camelCase + date parsing).
   * Falls back to manual conversion if SDK parsing fails (e.g. unknown status like `incomplete`).
   */
  private parseSubscription(
    obj: Record<string, unknown>,
  ): SubscriptionEntity | null {
    const result = subscriptionEntityFromJSON(JSON.stringify(obj));
    if (result.ok) {
      return result.value;
    }
    console.warn(
      "SDK subscription parsing failed, attempting manual fallback:",
      result.error,
    );
    return this.manualParseSubscription(obj);
  }

  /**
   * Manual fallback parser for when the SDK rejects a subscription
   * (e.g. unknown status like `incomplete`). Converts snake_case keys
   * to the camelCase SubscriptionEntity shape that convertToDatabaseSubscription expects.
   */
  private manualParseSubscription(
    raw: Record<string, unknown>,
  ): SubscriptionEntity | null {
    try {
      const parseDate = (v: unknown): Date | undefined =>
        typeof v === "string" ? new Date(v) : undefined;

      // Parse embedded product (can be string ID or object)
      let product: SubscriptionEntity["product"] = raw.product as string;
      if (typeof raw.product === "object" && raw.product !== null) {
        const p = raw.product as Record<string, unknown>;
        const prodResult = productEntityFromJSON(JSON.stringify(p));
        product = prodResult.ok ? prodResult.value : (p.id as string);
      }

      // Parse embedded customer (can be string ID or object)
      let customer: SubscriptionEntity["customer"] = raw.customer as string;
      if (typeof raw.customer === "object" && raw.customer !== null) {
        const c = raw.customer as Record<string, unknown>;
        customer = (c.id as string) ?? (raw.customer as unknown as string);
      }

      return {
        id: raw.id as string,
        mode: (raw.mode as SubscriptionEntity["mode"]) ?? "test",
        object: (raw.object as string) ?? "subscription",
        product,
        customer,
        items: Array.isArray(raw.items)
          ? raw.items.map((item: Record<string, unknown>) => ({
              object: (item.object as string) ?? "subscription_item",
              id: item.id as string,
              productId: (item.product_id as string) ?? "",
              priceId: (item.price_id as string) ?? "",
              units: (item.units as number) ?? 1,
              createdAt: parseDate(item.created_at) ?? new Date(),
              updatedAt: parseDate(item.updated_at) ?? new Date(),
              mode: (item.mode as "test" | "live") ?? "test",
            }))
          : undefined,
        collectionMethod:
          (raw.collection_method as SubscriptionEntity["collectionMethod"]) ??
          "charge_automatically",
        // Pass through the raw status even if the SDK doesn't know it
        status: raw.status as SubscriptionEntity["status"],
        currentPeriodStartDate: parseDate(raw.current_period_start_date),
        currentPeriodEndDate: parseDate(raw.current_period_end_date),
        canceledAt:
          raw.canceled_at != null
            ? (parseDate(raw.canceled_at as string) ?? null)
            : null,
        createdAt: parseDate(raw.created_at) ?? new Date(),
        updatedAt: parseDate(raw.updated_at) ?? new Date(),
      } as SubscriptionEntity;
    } catch (e) {
      console.error("Manual subscription fallback parsing failed:", e);
      return null;
    }
  }

  /**
   * Parse raw snake_case webhook object into a typed CheckoutEntity
   * using the SDK's built-in parser.
   */
  private parseCheckout(obj: Record<string, unknown>): CheckoutEntity | null {
    const result = checkoutEntityFromJSON(JSON.stringify(obj));
    if (result.ok) {
      return result.value;
    }
    console.warn("SDK checkout parsing failed:", result.error);
    return null;
  }

  /**
   * Parse raw snake_case webhook object into a typed ProductEntity
   * using the SDK's built-in parser.
   */
  private parseProduct(obj: Record<string, unknown>): ProductEntity | null {
    const result = productEntityFromJSON(JSON.stringify(obj));
    if (result.ok) {
      return result.value;
    }
    console.warn("SDK product parsing failed:", result.error);
    return null;
  }

  /** Extract customer ID from a CustomerEntity | string union. */
  private getCustomerId(
    customer: CustomerEntity | string | undefined | null,
  ): string | null {
    if (!customer) return null;
    if (typeof customer === "string") return customer;
    return customer.id ?? null;
  }

  /** Extract billing entity ID from webhook metadata. Prefers convexBillingEntityId, falls back to convexUserId. */
  private getConvexEntityId(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== "object") return null;
    const meta = metadata as Record<string, unknown>;
    // Prefer billingEntityId (org billing), fall back to userId (personal billing)
    if (typeof meta.convexBillingEntityId === "string") return meta.convexBillingEntityId;
    if (typeof meta.convexUserId === "string") return meta.convexUserId;
    return null;
  }

  /** Upsert a customer record if we have both entityId and customerId. */
  private async upsertCustomerFromWebhook(
    ctx: RunMutationCtx,
    customerId: string | null,
    entityId: string | null,
    customerEntity?: CustomerEntity | null,
  ) {
    if (!customerId || !entityId) return;
    try {
      await ctx.runMutation(this.component.lib.insertCustomer, {
        id: customerId,
        entityId,
        email: customerEntity?.email,
        name: customerEntity?.name ?? undefined,
        country: customerEntity?.country,
        mode: customerEntity?.mode,
        createdAt: customerEntity?.createdAt
          ? (customerEntity.createdAt instanceof Date
              ? customerEntity.createdAt.toISOString()
              : String(customerEntity.createdAt))
          : undefined,
        updatedAt: customerEntity?.updatedAt
          ? (customerEntity.updatedAt instanceof Date
              ? customerEntity.updatedAt.toISOString()
              : String(customerEntity.updatedAt))
          : undefined,
      });
    } catch {
      // insertCustomer is idempotent; ignore duplicate errors
    }
  }

  // ── Namespace getters (public API) ─────────────────────────

  get subscriptions() {
    type UpdateBehavior = "proration-charge-immediately" | "proration-charge" | "proration-none";
    return {
      getCurrent: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.getCurrentSubscription(ctx, { entityId }),
      list: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listUserSubscriptions(ctx, { entityId }),
      listAll: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listAllUserSubscriptions(ctx, { entityId }),
      update: async (
        ctx: RunActionCtx,
        args: { entityId: string; subscriptionId?: string; productId?: string; units?: number; updateBehavior?: UpdateBehavior },
      ) => {
        if (args.productId && args.units) throw new Error("Provide productId OR units, not both");
        if (!args.productId && !args.units) throw new Error("Provide productId or units");
        if (args.productId) {
          return await this.changeSubscription(ctx, {
            entityId: args.entityId,
            productId: args.productId,
            updateBehavior: args.updateBehavior,
          });
        }
        return await this.updateSubscriptionSeats(ctx, {
          entityId: args.entityId,
          subscriptionId: args.subscriptionId,
          units: args.units!,
          updateBehavior: args.updateBehavior,
        });
      },
      cancel: (ctx: RunActionCtx, args: { entityId: string; revokeImmediately?: boolean }) =>
        this.cancelSubscription(ctx, args),
      pause: (ctx: RunActionCtx, { entityId }: { entityId: string }) =>
        this.pauseSubscription(ctx, { entityId }),
      resume: (ctx: RunActionCtx, { entityId }: { entityId: string }) =>
        this.resumeSubscription(ctx, { entityId }),
    };
  }

  get checkouts() {
    return {
      create: async (
        ctx: RunActionCtx,
        args: {
          entityId: string;
          userId: string;
          email: string;
          productId: string;
          successUrl?: string;
          fallbackSuccessUrl?: string;
          units?: number;
          metadata?: Record<string, string>;
          discountCode?: string;
          theme?: "light" | "dark";
        },
      ): Promise<{ url: string }> => {
        // 3-tier successUrl resolution
        let resolvedSuccessUrl = args.successUrl;
        if (!resolvedSuccessUrl) {
          const product = await ctx.runQuery(this.component.lib.getProduct, { id: args.productId });
          resolvedSuccessUrl = product?.defaultSuccessUrl ?? undefined;
        }
        if (!resolvedSuccessUrl) {
          resolvedSuccessUrl = args.fallbackSuccessUrl;
        }

        const checkout = await this.createCheckoutSession(ctx, {
          productId: args.productId,
          entityId: args.entityId,
          userId: args.userId,
          email: args.email,
          ...(resolvedSuccessUrl ? { successUrl: resolvedSuccessUrl } : {}),
          units: args.units,
          metadata: args.metadata,
        });
        let checkoutUrl = checkout.checkoutUrl;
        if (!checkoutUrl) throw new Error("Checkout URL missing from Creem response");
        if (args.theme) {
          const separator = checkoutUrl.includes("?") ? "&" : "?";
          checkoutUrl = `${checkoutUrl}${separator}theme=${args.theme}`;
        }
        return { url: checkoutUrl };
      },
    };
  }

  get products() {
    return {
      list: (ctx: RunQueryCtx, options?: { includeArchived?: boolean }) =>
        this.listProducts(ctx, options),
      get: (ctx: RunQueryCtx, { productId }: { productId: string }) =>
        this.getProduct(ctx, { productId }),
    };
  }

  get customers() {
    return {
      retrieve: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.getCustomerByEntityId(ctx, entityId),
      portalUrl: (ctx: RunActionCtx, { entityId }: { entityId: string }) =>
        this.createCustomerPortalSession(ctx, { entityId }),
    };
  }

  get orders() {
    return {
      list: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listUserOrders(ctx, { entityId }),
    };
  }

  // ── Component helpers (public, flat) ──────────────────────

  /**
   * Composite billing model for connected widgets.
   * Graceful when `entityId` is null — returns public product catalog only.
   * Pass `user` to include user context in the response (widgets expect this).
   */
  async getBillingModel(
    ctx: RunQueryCtx,
    { entityId, user }: {
      entityId: string | null;
      user?: { _id: string; email: string } | null;
    },
  ) {
    const products = await this.listProducts(ctx);
    if (!entityId) {
      return {
        user: user ?? null,
        billingSnapshot: null as BillingSnapshot | null,
        allProducts: products,
        ownedProductIds: [] as string[],
        subscriptionProductId: null as string | null,
        activeSubscriptions: [] as Array<{
          id: string;
          productId: string;
          status: string;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          seats: number | null;
          recurringInterval: string | null;
          trialEnd: string | null;
        }>,
        hasCreemCustomer: false,
      };
    }
    const [billingSnapshot, subscription, activeSubscriptions, customer, orders] =
      await Promise.all([
        this.getBillingSnapshot(ctx, { entityId }),
        this.getCurrentSubscription(ctx, { entityId }),
        this.listUserSubscriptions(ctx, { entityId }),
        this.getCustomerByEntityId(ctx, entityId),
        this.listUserOrders(ctx, { entityId }),
      ]);
    const ownedProductIds = [...new Set(orders.map((o) => o.productId))];
    return {
      user: user ?? null,
      billingSnapshot,
      allProducts: products,
      ownedProductIds,
      subscriptionProductId: subscription?.productId ?? null,
      activeSubscriptions: activeSubscriptions.map((s) => ({
        id: s.id,
        productId: s.productId,
        status: s.status,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        currentPeriodEnd: s.currentPeriodEnd,
        currentPeriodStart: s.currentPeriodStart,
        seats: s.seats,
        recurringInterval: s.recurringInterval,
        trialEnd: s.trialEnd ?? null,
      })),
      hasCreemCustomer: customer != null,
    };
  }

  // ── api({ resolve }) convenience ──────────────────────────

  /**
   * Generate ready-to-export Convex function definitions.
   * Each function calls the `resolve` callback to determine the authenticated
   * user and billing entity, then delegates to the corresponding class method.
   *
   * For full control, use the namespace getters directly instead
   * (e.g. `creem.subscriptions.cancel(ctx, { entityId })`).
   */
  api({ resolve }: { resolve: ApiResolver }) {
    return {
      uiModel: queryGeneric({
        args: {},
        returns: v.any(),
        handler: async (ctx) => {
          let resolved: { userId: string; email: string; entityId: string } | null = null;
          try {
            resolved = await resolve(ctx);
          } catch {
            // No authenticated user — return unauthenticated model
          }
          return await this.getBillingModel(ctx, {
            entityId: resolved?.entityId ?? null,
            user: resolved ? { _id: resolved.userId, email: resolved.email } : null,
          });
        },
      }),
      snapshot: queryGeneric({
        args: {},
        returns: v.any(),
        handler: async (ctx) => {
          let resolved: { entityId: string } | null = null;
          try {
            resolved = await resolve(ctx);
          } catch {
            return null;
          }
          if (!resolved) return null;
          return await this.getBillingSnapshot(ctx, { entityId: resolved.entityId });
        },
      }),
      checkouts: {
        create: actionGeneric({
          args: {
            productId: v.string(),
            successUrl: v.optional(v.string()),
            fallbackSuccessUrl: v.optional(v.string()),
            units: v.optional(v.number()),
            metadata: v.optional(v.record(v.string(), v.string())),
            discountCode: v.optional(v.string()),
            theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
          },
          returns: v.object({ url: v.string() }),
          handler: async (ctx, args) => {
            const { entityId, userId, email } = await resolve(ctx);
            return await this.checkouts.create(ctx, {
              entityId, userId, email, ...args,
            });
          },
        }),
      },
      subscriptions: {
        update: actionGeneric({
          args: {
            subscriptionId: v.optional(v.string()),
            productId: v.optional(v.string()),
            units: v.optional(v.number()),
            updateBehavior: v.optional(v.union(
              v.literal("proration-charge-immediately"),
              v.literal("proration-charge"),
              v.literal("proration-none"),
            )),
          },
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            await this.subscriptions.update(ctx, { entityId, ...args });
          },
        }),
        cancel: actionGeneric({
          args: { revokeImmediately: v.optional(v.boolean()) },
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            await this.subscriptions.cancel(ctx, { entityId, ...args });
          },
        }),
        resume: actionGeneric({
          args: {},
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            await this.subscriptions.resume(ctx, { entityId });
          },
        }),
        pause: actionGeneric({
          args: {},
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            await this.subscriptions.pause(ctx, { entityId });
          },
        }),
        list: queryGeneric({
          args: {},
          returns: v.any(),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.subscriptions.list(ctx, { entityId });
          },
        }),
        listAll: queryGeneric({
          args: {},
          returns: v.array(
            v.object({
              ...schema.tables.subscriptions.validator.fields,
              product: v.union(schema.tables.products.validator, v.null()),
            }),
          ),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.subscriptions.listAll(ctx, { entityId });
          },
        }),
      },
      products: {
        list: queryGeneric({
          args: {},
          handler: async (ctx) => {
            return await this.products.list(ctx);
          },
        }),
        get: queryGeneric({
          args: { productId: v.string() },
          returns: v.union(schema.tables.products.validator, v.null()),
          handler: async (ctx, args) => {
            return await this.products.get(ctx, { productId: args.productId });
          },
        }),
      },
      customers: {
        retrieve: queryGeneric({
          args: {},
          returns: v.union(schema.tables.customers.validator, v.null()),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.customers.retrieve(ctx, { entityId });
          },
        }),
        portalUrl: actionGeneric({
          args: {},
          returns: v.object({ url: v.string() }),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.customers.portalUrl(ctx, { entityId });
          },
        }),
      },
      orders: {
        list: queryGeneric({
          args: {},
          returns: v.array(schema.tables.orders.validator),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.orders.list(ctx, { entityId });
          },
        }),
      },
    };
  }

  registerRoutes(
    http: HttpRouter,
    {
      path = "/creem/events",
      events,
    }: {
      path?: string;
      events?: WebhookEventHandlers;
    } = {},
  ) {
    const mergedEvents: WebhookEventHandlers = { ...events };

    http.route({
      path,
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        if (!request.body) {
          throw new Error("No body");
        }
        const body = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key] = value;
        });
        try {
          await this.verifyWebhook(body, headers);
          const event = JSON.parse(body) as CreemWebhookEvent;
          const eventType = this.getEventType(event);
          const eventData = this.getEventData(event);

          console.log(
            `[creem-webhook] eventType=${eventType}`,
            `body=${JSON.stringify(event)}`,
          );

          if (
            eventData &&
            typeof eventData === "object" &&
            eventType.startsWith("checkout.")
          ) {
            const raw = eventData as Record<string, unknown>;
            const checkout = this.parseCheckout(raw);
            if (checkout && eventType === "checkout.completed") {
              // Auto-create customer record from checkout metadata
              const customerObj =
                typeof checkout.customer === "object"
                  ? checkout.customer
                  : undefined;
              const customerId = this.getCustomerId(customerObj);
              const entityId = this.getConvexEntityId(checkout.metadata);
              await this.upsertCustomerFromWebhook(
                ctx,
                customerId,
                entityId,
                customerObj as CustomerEntity | undefined,
              );

              // Process embedded subscription if present (recurring checkout).
              // checkoutEntityFromJSON already parsed it into a typed SubscriptionEntity,
              // so use it directly — do NOT re-parse through subscriptionEntityFromJSON.
              if (
                checkout.subscription &&
                typeof checkout.subscription === "object"
              ) {
                const embeddedSub = checkout.subscription as SubscriptionEntity;
                // Recover metadata: SDK strips it from SubscriptionEntity.
                // Use checkout-level metadata as fallback (same convexUserId).
                const embeddedRaw = (raw.subscription ?? {}) as Record<
                  string,
                  unknown
                >;
                const rawMeta = (embeddedRaw.metadata ??
                  checkout.metadata ??
                  {}) as Record<string, unknown>;
                const subscription = convertToDatabaseSubscription(
                  embeddedSub,
                  { rawMetadata: rawMeta },
                );
                await ctx.runMutation(this.component.lib.createSubscription, {
                  subscription,
                });
              }

              // Store the order (present for both one-time and subscription checkouts)
              if (checkout.order && typeof checkout.order === "object") {
                const o = checkout.order as Record<string, unknown>;
                const order = convertToOrder(
                  {
                    id: o.id as string,
                    customer: (o.customer as string) ?? null,
                    product: o.product as string,
                    amount: o.amount as number,
                    currency: o.currency as string,
                    status: o.status as string,
                    type: o.type as string,
                    transaction: (o.transaction as string) ?? null,
                    subTotal: o.subTotal as number | undefined,
                    sub_total: o.sub_total as number | undefined,
                    taxAmount: o.taxAmount as number | undefined,
                    tax_amount: o.tax_amount as number | undefined,
                    discountAmount: o.discountAmount as number | undefined,
                    discount_amount: o.discount_amount as number | undefined,
                    amountDue: o.amountDue as number | undefined,
                    amount_due: o.amount_due as number | undefined,
                    amountPaid: o.amountPaid as number | undefined,
                    amount_paid: o.amount_paid as number | undefined,
                    discount: (o.discount as string) ?? null,
                    affiliate: (o.affiliate as string) ?? null,
                    mode: o.mode as string | undefined,
                    createdAt: o.createdAt as Date | string | undefined,
                    created_at: o.created_at as string | undefined,
                    updatedAt: o.updatedAt as Date | string | undefined,
                    updated_at: o.updated_at as string | undefined,
                  },
                  {
                    checkoutId: checkout.id,
                    metadata: checkout.metadata as
                      | Record<string, unknown>
                      | undefined,
                  },
                );
                await ctx.runMutation(this.component.lib.createOrder, {
                  order,
                });
              }
            }
          }

          if (
            eventData &&
            typeof eventData === "object" &&
            eventType.startsWith("subscription.")
          ) {
            const raw = eventData as Record<string, unknown>;
            const parsed = this.parseSubscription(raw);
            if (parsed) {
              // Pass raw metadata since SDK's SubscriptionEntity type strips it
              const rawMeta = (raw.metadata ?? {}) as Record<string, unknown>;
              const subscription = convertToDatabaseSubscription(parsed, {
                rawMetadata: rawMeta,
              });
              if (eventType === "subscription.created") {
                await ctx.runMutation(this.component.lib.createSubscription, {
                  subscription,
                });
              } else {
                await ctx.runMutation(this.component.lib.updateSubscription, {
                  subscription,
                });
              }

              // Auto-create customer record from subscription metadata
              const customerEntity =
                typeof parsed.customer === "object"
                  ? (parsed.customer as CustomerEntity)
                  : undefined;
              const customerId = this.getCustomerId(parsed.customer);
              const entityId = this.getConvexEntityId(
                raw.metadata ??
                  (parsed as unknown as Record<string, unknown>).metadata,
              );
              await this.upsertCustomerFromWebhook(
                ctx,
                customerId,
                entityId,
                customerEntity,
              );
            } else {
              // Fallback: SDK parsing failed (e.g., unknown status)
              // Still try to extract subscription ID for update events
              const subId = typeof raw.id === "string" ? raw.id : null;
              if (subId) {
                console.warn(
                  `Could not parse subscription for ${eventType}, id: ${subId}`,
                );
              }
            }
          }

          if (
            eventData &&
            typeof eventData === "object" &&
            eventType.startsWith("product.")
          ) {
            const raw = eventData as Record<string, unknown>;
            const parsed = this.parseProduct(raw);
            if (parsed) {
              const product = convertToDatabaseProduct(parsed);
              if (eventType === "product.created") {
                await ctx.runMutation(this.component.lib.createProduct, {
                  product,
                });
              } else {
                await ctx.runMutation(this.component.lib.updateProduct, {
                  product,
                });
              }
            } else {
              console.warn(`Could not parse product for ${eventType}`);
            }
          }

          const handler = mergedEvents[eventType];
          if (handler) {
            await handler(ctx, event);
          }

          return new Response("Accepted", { status: 202 });
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error(error);
            return new Response("Forbidden", { status: 403 });
          }
          throw error;
        }
      }),
    });
  }
}
