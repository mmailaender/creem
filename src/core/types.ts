export type PlanCategory = "free" | "trial" | "paid" | "enterprise" | "custom";

export type BillingType = "recurring" | "onetime" | "custom";

export type SupportedRecurringCycle =
  | "every-month"
  | "every-three-months"
  | "every-six-months"
  | "every-year";

export type RecurringCycle = SupportedRecurringCycle | "custom";

export type OneTimePaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "partially_refunded";

export type AvailableAction =
  | "checkout"
  | "portal"
  | "cancel"
  | "reactivate"
  | "switch_interval"
  | "update_seats"
  | "contact_sales";

export type PlanCatalogEntry = {
  planId: string;
  category: PlanCategory;
  billingType?: BillingType;
  billingCycles?: RecurringCycle[];
  pricingModel?: "flat" | "seat";
  creemProductIds?: Record<string, string>;
  contactUrl?: string;
  recommended?: boolean;
  metadata?: Record<string, unknown>;
};

/** PlanCatalogEntry + resolved UI display fields (title, description). */
export type UIPlanEntry = PlanCatalogEntry & {
  title?: string;
  description?: string;
};

export type PlanCatalog = {
  version: string;
  plans: PlanCatalogEntry[];
  defaultPlanId?: string;
};

export type SubscriptionSnapshot = {
  id?: string;
  productId?: string;
  status?: string;
  recurringInterval?: string | null;
  seats?: number | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
};

export type PaymentSnapshot = {
  status: OneTimePaymentStatus;
  checkoutId?: string;
  orderId?: string;
  customerId?: string;
  productId?: string;
  requestId?: string;
};

export type CheckoutSuccessParams = {
  checkoutId?: string;
  orderId?: string;
  customerId?: string;
  productId?: string;
  requestId?: string;
  signature?: string;
};

export type BillingSnapshot = {
  resolvedAt: string;
  catalogVersion?: string;
  activePlanId: string | null;
  activeCategory: PlanCategory;
  billingType: BillingType;
  recurringCycle?: RecurringCycle;
  availableBillingCycles: RecurringCycle[];
  subscriptionState?: string;
  seats?: number;
  payment: PaymentSnapshot | null;
  availableActions: AvailableAction[];
  metadata?: Record<string, unknown>;
};

export type BillingUserContext = Record<string, unknown>;

export type BillingResolverInput = {
  catalog?: PlanCatalog;
  currentSubscription?: SubscriptionSnapshot | null;
  allSubscriptions?: SubscriptionSnapshot[];
  payment?: PaymentSnapshot | null;
  userContext?: BillingUserContext;
  now?: string;
};
