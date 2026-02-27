import type { FunctionReference } from "convex/server";
import type { BillingSnapshot, RecurringCycle } from "../../core/types.js";

export type { CheckoutIntent } from "../../core/types.js";

export type BillingPermissions = {
  canCheckout?: boolean;
  canChangeSubscription?: boolean;
  canCancelSubscription?: boolean;
  canResumeSubscription?: boolean;
  canUpdateSeats?: boolean;
  canAccessPortal?: boolean;
};

export type ConnectedBillingApi = {
  uiModel: FunctionReference<"query">;
  checkouts: {
    create: FunctionReference<"action">;
  };
  subscriptions?: {
    update?: FunctionReference<"mutation">;
    cancel?: FunctionReference<"mutation">;
    resume?: FunctionReference<"mutation">;
  };
  customers?: {
    portalUrl?: FunctionReference<"action">;
  };
};

export type ConnectedProduct = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billingType?: string;
  billingPeriod?: string;
  status?: string;
  taxMode?: string;
  taxCategory?: string;
  imageUrl?: string;
  features?: Array<{ id: string; description: string }>;
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
  allProducts: ConnectedProduct[];
  ownedProductIds: string[];
  subscriptionProductId: string | null;
  activeSubscriptions?: Array<{
    id: string;
    productId: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string;
    seats: number | null;
    recurringInterval: string | null;
    trialEnd?: string | null;
  }>;
  hasCreemCustomer?: boolean;
  policy?: unknown;
};

export type SubscriptionPlanType =
  | "free"
  | "single"
  | "seat-based"
  | "enterprise";

export type SubscriptionPlanRegistration = {
  planId: string;
  type: SubscriptionPlanType;
  title?: string;
  description?: string;
  contactUrl?: string;
  recommended?: boolean;
  productIds?: Partial<Record<RecurringCycle, string>>;
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

