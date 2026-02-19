import type {
  GenericMutationCtx,
  GenericActionCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type {
  ProductEntity as CreemProduct,
  SubscriptionEntity as CreemSubscription,
  FeatureEntity,
} from "creem/models/components";
import type { Infer } from "convex/values";
import type schema from "./schema.js";

export type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
export type RunMutationCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};
export type RunActionCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};

const toIsoString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
};

const toIsoStringOrNow = (value: unknown): string => {
  return toIsoString(value) ?? new Date().toISOString();
};

const entityId = (value: unknown): string | null => {
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

const convertCreemFeature = (feature: FeatureEntity) => ({
  id: feature.id,
  createdAt: new Date().toISOString(),
  modifiedAt: null,
  type: "feature",
  description: feature.description,
  selectable: false,
  deletable: false,
  organizationId: "creem",
  metadata: {},
  properties: undefined,
});

export const convertToDatabaseSubscription = (
  subscription: CreemSubscription,
): Infer<typeof schema.tables.subscriptions.validator> => {
  const customerId = entityId(subscription.customer);
  if (!customerId) {
    throw new Error("Creem subscription is missing customer id");
  }
  const productId =
    entityId(subscription.product) ??
    subscription.items?.[0]?.productId ??
    null;
  if (!productId) {
    throw new Error("Creem subscription is missing product id");
  }
  const product =
    typeof subscription.product === "object" && subscription.product
      ? subscription.product
      : null;
  const now = new Date().toISOString();
  return {
    id: subscription.id,
    customerId,
    createdAt: toIsoStringOrNow(subscription.createdAt),
    modifiedAt: toIsoString(subscription.updatedAt),
    productId,
    checkoutId: null,
    amount: product?.price ?? null,
    currency: product?.currency ?? null,
    recurringInterval: product?.billingPeriod ?? null,
    status: subscription.status,
    currentPeriodStart:
      toIsoString(subscription.currentPeriodStartDate) ??
      toIsoStringOrNow(subscription.createdAt),
    currentPeriodEnd: toIsoString(subscription.currentPeriodEndDate),
    cancelAtPeriodEnd: subscription.status === "scheduled_cancel",
    customerCancellationReason: null,
    customerCancellationComment: null,
    startedAt:
      toIsoString(subscription.currentPeriodStartDate) ??
      toIsoString(subscription.createdAt),
    endedAt:
      subscription.status === "canceled"
        ? (toIsoString(subscription.canceledAt) ?? now)
        : null,
    metadata:
      (subscription as { metadata?: Record<string, unknown> }).metadata ?? {},
    discountId:
      (subscription.discount as { id?: string } | undefined)?.id ?? null,
    canceledAt: toIsoString(subscription.canceledAt),
    endsAt: null,
    recurringIntervalCount: undefined,
    trialStart: null,
    trialEnd: null,
    seats: subscription.items?.[0]?.units ?? null,
    customFieldData: undefined,
    priceId: subscription.items?.[0]?.priceId,
  };
};

export const convertToDatabaseProduct = (
  product: CreemProduct,
): Infer<typeof schema.tables.products.validator> => {
  return {
    id: product.id,
    organizationId: "creem",
    name: product.name,
    description: product.description,
    isRecurring: product.billingType === "recurring",
    isArchived: product.status !== "active",
    createdAt: toIsoStringOrNow(product.createdAt),
    modifiedAt: toIsoString(product.updatedAt),
    recurringInterval: product.billingType === "recurring" ? product.billingPeriod : null,
    metadata: {},
    trialInterval: null,
    trialIntervalCount: null,
    recurringIntervalCount: null,
    prices: [
      {
        id: `${product.id}:default`,
        productId: product.id,
        amountType: "fixed",
        isArchived: product.status !== "active",
        createdAt: toIsoStringOrNow(product.createdAt),
        modifiedAt: toIsoString(product.updatedAt),
        recurringInterval:
          product.billingType === "recurring" ? product.billingPeriod : null,
        type: product.billingType === "recurring" ? "recurring" : "one_time",
        source: "creem",
        priceAmount: product.price,
        priceCurrency: product.currency,
      },
    ],
    benefits: product.features?.map(convertCreemFeature),
    medias: [],
  };
};
