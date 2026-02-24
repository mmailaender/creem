import type { FunctionReference } from "convex/server";
import type { BillingSnapshot, RecurringCycle } from "../../core/types.js";

export type ConnectedBillingApi = {
  getBillingUiModel: FunctionReference<"query">;
  generateCheckoutLink: FunctionReference<"action">;
  generateCustomerPortalUrl?: FunctionReference<"action">;
  changeCurrentSubscription?: FunctionReference<"action">;
  updateSubscriptionSeats?: FunctionReference<"action">;
  cancelCurrentSubscription?: FunctionReference<"action">;
  resumeCurrentSubscription?: FunctionReference<"action">;
  syncProducts?: FunctionReference<"action">;
  createDemoUser?: FunctionReference<"mutation">;
  grantDemoEntitlement?: FunctionReference<"mutation">;
};

export type ConnectedProductPrice = {
  priceAmount?: number;
  priceCurrency?: string;
  recurringInterval?: string | null;
  amountType?: string;
};

export type ConnectedProduct = {
  id: string;
  name?: string;
  description?: string;
  recurringInterval?: string | null;
  trialInterval?: string | null;
  trialIntervalCount?: number | null;
  prices?: ConnectedProductPrice[];
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
  activeSubscriptions?: Array<{
    id: string;
    productId: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string;
    seats: number | null;
    recurringInterval: string | null;
  }>;
  hasCreemCustomer?: boolean;
  planCatalog?: {
    version?: string;
    defaultPlanId?: string;
    plans: Array<{
      planId: string;
      category: string;
      billingType?: string;
      pricingModel?: string;
      displayName: string;
      description?: string;
      creemProductIds?: Record<string, string>;
      billingCycles?: string[];
      contactUrl?: string;
      recommended?: boolean;
    }>;
  } | null;
  policy?: unknown;
};

export type SubscriptionPlanType = "free" | "single" | "seat-based" | "enterprise";

export type SubscriptionPlanRegistration = {
  planId: string;
  type: SubscriptionPlanType;
  displayName?: string;
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
