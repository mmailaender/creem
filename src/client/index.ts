import "./polyfill.js";
import { Creem as CreemSDK } from "creem";
import type {
  CheckoutEntity,
  ProductEntity,
  SubscriptionEntity,
} from "creem/models/components";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import {
  type FunctionReference,
  type GenericActionCtx,
  type GenericDataModel,
  type HttpRouter,
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
  type ApiFromModules,
} from "convex/server";
import { type Infer, v } from "convex/values";
import { mapValues } from "remeda";
import schema from "../component/schema.js";
import {
  type RunMutationCtx,
  type RunQueryCtx,
  convertToDatabaseProduct,
  convertToDatabaseSubscription,
  type RunActionCtx,
} from "../component/util.js";
import type { ComponentApi } from "../component/_generated/component.js";

export const subscriptionValidator = schema.tables.subscriptions.validator;
export type Subscription = Infer<typeof subscriptionValidator>;

export type SubscriptionHandler = FunctionReference<
  "mutation",
  "internal",
  { subscription: Subscription }
>;

export type CreemComponentApi = ApiFromModules<{
  checkout: ReturnType<Creem["api"]>;
}>["checkout"];

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

export class Creem<
  DataModel extends GenericDataModel = GenericDataModel,
  Products extends Record<string, string> = Record<string, string>,
> {
  public creem: CreemSDK;
  public products: Products;
  private apiKey: string;
  private webhookSecret: string;
  private serverIdx?: number;
  private serverURL?: string;

  constructor(
    public component: ComponentApi,
    private config: {
      products?: Products;
      getUserInfo: (ctx: RunQueryCtx) => Promise<{
        userId: string;
        email: string;
      }>;
      apiKey?: string;
      webhookSecret?: string;
      serverIdx?: number;
      serverURL?: string;
    },
  ) {
    this.products = config.products ?? ({} as Products);
    this.apiKey = config.apiKey ?? process.env["CREEM_API_KEY"] ?? "";
    this.webhookSecret =
      config.webhookSecret ?? process.env["CREEM_WEBHOOK_SECRET"] ?? "";
    this.serverIdx =
      config.serverIdx ??
      (process.env["CREEM_SERVER_IDX"]
        ? Number(process.env["CREEM_SERVER_IDX"])
        : undefined);
    this.serverURL = config.serverURL ?? process.env["CREEM_SERVER_URL"];

    this.creem = new CreemSDK({
      apiKey: this.apiKey,
      ...(this.serverIdx !== undefined ? { serverIdx: this.serverIdx } : {}),
      ...(this.serverURL ? { serverURL: this.serverURL } : {}),
    });
  }
  getCustomerByUserId(ctx: RunQueryCtx, userId: string) {
    return ctx.runQuery(this.component.lib.getCustomerByUserId, { userId });
  }
  async syncProducts(ctx: RunActionCtx) {
    await ctx.runAction(this.component.lib.syncProducts, {
      apiKey: this.apiKey,
      serverIdx: this.serverIdx,
      serverURL: this.serverURL,
    });
  }

  async createCheckoutSession(
    ctx: RunMutationCtx,
    {
      productId,
      userId,
      email,
      successUrl,
      units,
      metadata,
    }: {
      productId: string;
      userId: string;
      email: string;
      successUrl: string;
      units?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<CheckoutEntity> {
    const dbCustomer = await ctx.runQuery(
      this.component.lib.getCustomerByUserId,
      {
        userId,
      },
    );

    const checkout = await this.creem.checkouts.create({
      productId,
      successUrl,
      units,
      metadata,
      customer: dbCustomer ? { id: dbCustomer.id } : { email },
    });

    if (!dbCustomer) {
      const customerId = getEntityId(checkout.customer);
      if (!customerId) {
        throw new Error("Checkout completed but customer id is missing");
      }
      await ctx.runMutation(this.component.lib.insertCustomer, {
        id: customerId,
        userId,
      });
    }

    return checkout;
  }

  async createCustomerPortalSession(
    ctx: GenericActionCtx<DataModel>,
    { userId }: { userId: string },
  ) {
    const customer = await ctx.runQuery(
      this.component.lib.getCustomerByUserId,
      { userId },
    );

    if (!customer) {
      throw new Error("Customer not found");
    }

    const portal = await this.creem.customers.generateBillingLinks({
      customerId: customer.id,
    });
    return { url: portal.customerPortalLink };
  }

  listProducts(
    ctx: RunQueryCtx,
    { includeArchived }: { includeArchived?: boolean } = {},
  ) {
    return ctx.runQuery(this.component.lib.listProducts, {
      includeArchived,
    });
  }
  async getCurrentSubscription(
    ctx: RunQueryCtx,
    { userId }: { userId: string },
  ) {
    const subscription = await ctx.runQuery(
      this.component.lib.getCurrentSubscription,
      {
        userId,
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
    const productKey = (
      Object.keys(this.products) as Array<keyof Products>
    ).find((key) => this.products[key] === subscription.productId);
    return {
      ...subscription,
      productKey,
      product,
    };
  }
  /** Return all subscriptions for a user, including ended and expired trials. */
  listAllUserSubscriptions(
    ctx: RunQueryCtx,
    { userId }: { userId: string },
  ) {
    return ctx.runQuery(this.component.lib.listAllUserSubscriptions, {
      userId,
    });
  }
  getProduct(ctx: RunQueryCtx, { productId }: { productId: string }) {
    return ctx.runQuery(this.component.lib.getProduct, { id: productId });
  }
  async changeSubscription(
    ctx: GenericActionCtx<DataModel>,
    { productId }: { productId: string },
  ) {
    const { userId } = await this.config.getUserInfo(ctx);
    const subscription = await this.getCurrentSubscription(ctx, { userId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (subscription.productId === productId) {
      throw new Error("Subscription already on this product");
    }
    const updatedSubscription = await this.creem.subscriptions.upgrade(
      subscription.id,
      {
        productId,
      },
    );
    return updatedSubscription;
  }

  /** Cancel an active or trialing subscription, optionally revoking immediately. */
  async cancelSubscription(
    ctx: RunActionCtx,
    { revokeImmediately }: { revokeImmediately?: boolean } = {},
  ) {
    const { userId } = await this.config.getUserInfo(ctx);
    const subscription = await this.getCurrentSubscription(ctx, { userId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      throw new Error("Subscription is not active");
    }
    const updatedSubscription = await this.creem.subscriptions.cancel(
      subscription.id,
      revokeImmediately
        ? { mode: "immediate" }
        : { mode: "scheduled", onExecute: "cancel" },
    );
    return updatedSubscription;
  }

  private async verifyWebhook(
    body: string,
    headers: Record<string, string>,
  ) {
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

  api() {
    return {
      changeCurrentSubscription: actionGeneric({
        args: {
          productId: v.string(),
        },
        handler: async (ctx, args) => {
          await this.changeSubscription(ctx, {
            productId: args.productId,
          });
        },
      }),
      cancelCurrentSubscription: actionGeneric({
        args: {
          revokeImmediately: v.optional(v.boolean()),
        },
        handler: async (ctx, args) => {
          await this.cancelSubscription(ctx, {
            revokeImmediately: args.revokeImmediately,
          });
        },
      }),
      getConfiguredProducts: queryGeneric({
        args: {},
        handler: async (ctx) => {
          const products = await this.listProducts(ctx);
          return mapValues(this.products, (productId) =>
            products.find((p) => p.id === productId),
          );
        },
      }),
      listAllProducts: queryGeneric({
        args: {},
        handler: async (ctx) => {
          return await this.listProducts(ctx);
        },
      }),
      listAllSubscriptions: queryGeneric({
        args: {},
        returns: v.array(
          v.object({
            ...schema.tables.subscriptions.validator.fields,
            product: v.union(schema.tables.products.validator, v.null()),
          }),
        ),
        handler: async (ctx) => {
          const { userId } = await this.config.getUserInfo(ctx);
          return await this.listAllUserSubscriptions(ctx, { userId });
        },
      }),
      generateCheckoutLink: actionGeneric({
        args: {
          productId: v.string(),
          successUrl: v.string(),
          units: v.optional(v.number()),
          metadata: v.optional(v.record(v.string(), v.string())),
        },
        returns: v.object({
          url: v.string(),
        }),
        handler: async (ctx, args) => {
          const { userId, email } = await this.config.getUserInfo(ctx);
          const checkout = await this.createCheckoutSession(ctx, {
            productId: args.productId,
            userId,
            email,
            successUrl: args.successUrl,
            units: args.units,
            metadata: args.metadata,
          });
          const checkoutUrl = checkout.checkoutUrl;
          if (!checkoutUrl) {
            throw new Error("Checkout URL missing from Creem response");
          }
          return { url: checkoutUrl };
        },
      }),
      generateCustomerPortalUrl: actionGeneric({
        args: {},
        returns: v.object({ url: v.string() }),
        handler: async (ctx) => {
          const { userId } = await this.config.getUserInfo(ctx);
          const { url } = await this.createCustomerPortalSession(ctx, {
            userId,
          });
          return { url };
        },
      }),
    };
  }

  checkoutApi() {
    return this.api();
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

          if (
            eventData &&
            typeof eventData === "object" &&
            eventType.startsWith("subscription.")
          ) {
            const subscription = convertToDatabaseSubscription(
              eventData as SubscriptionEntity,
            );
            if (eventType === "subscription.created") {
              await ctx.runMutation(this.component.lib.createSubscription, {
                subscription,
              });
            } else {
              await ctx.runMutation(this.component.lib.updateSubscription, {
                subscription,
              });
            }
          }

          if (
            eventData &&
            typeof eventData === "object" &&
            eventType.startsWith("product.")
          ) {
            const product = convertToDatabaseProduct(eventData as ProductEntity);
            if (eventType === "product.created") {
              await ctx.runMutation(this.component.lib.createProduct, {
                product,
              });
            } else {
              await ctx.runMutation(this.component.lib.updateProduct, {
                product,
              });
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
