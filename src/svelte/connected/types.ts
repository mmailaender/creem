import type { FunctionReference } from "convex/server";
import type { BillingSnapshot, RecurringCycle } from "../../core/types.js";

export type ConnectedBillingApi = {
  getBillingUiModel: FunctionReference<"query">;
  generateCheckoutLink: FunctionReference<"action">;
  generateCustomerPortalUrl?: FunctionReference<"action">;
  syncProducts?: FunctionReference<"action">;
  createDemoUser?: FunctionReference<"mutation">;
  grantDemoEntitlement?: FunctionReference<"mutation">;
};

export type ConnectedProduct = {
  id: string;
  name?: string;
  recurringInterval?: string | null;
  trialInterval?: string | null;
  trialIntervalCount?: number | null;
};

export type ConnectedBillingModel = {
  user: {
    _id: string;
    email: string;
    isFree?: boolean;
    isTrialing?: boolean;
    trialEnd?: string | null;
  } | null;
  billingSnapshot: BillingSnapshot | null;
  configuredProducts: Record<string, ConnectedProduct | null>;
  allProducts: ConnectedProduct[];
  ownedProductIds: string[];
  subscriptionProductId: string | null;
  policy?: unknown;
};

export type SubscriptionPlanType = "free" | "single" | "seat-based" | "enterprise";

export type SubscriptionPlanRegistration = {
  planId: string;
  type: SubscriptionPlanType;
  displayName?: string;
  description?: string;
  contactUrl?: string;
  productId?: string;
  productIds?: Partial<Record<RecurringCycle | "default", string>>;
};

export type ProductType = "one-time" | "recurring";

export type Transition =
  | { from: string; to: string; kind: "direct" }
  | {
      from: string;
      to: string;
      kind: "via_product";
      viaProductId: string;
    };

export type ProductItemRegistration = {
  productId: string;
  type: ProductType;
  title?: string;
  description?: string;
};
