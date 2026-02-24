import type {
  BillingType,
  PlanCatalog,
  PlanCatalogEntry,
  PlanCategory,
  RecurringCycle,
  SupportedRecurringCycle,
} from "./types.js";

export const SUPPORTED_RECURRING_CYCLES: SupportedRecurringCycle[] = [
  "every-month",
  "every-three-months",
  "every-six-months",
  "every-year",
];

const PLAN_CATEGORIES: PlanCategory[] = [
  "free",
  "trial",
  "paid",
  "enterprise",
  "custom",
];

const BILLING_TYPES: BillingType[] = ["recurring", "onetime", "custom"];

const PLAN_CATEGORY_SET = new Set(PLAN_CATEGORIES);
const BILLING_TYPE_SET = new Set(BILLING_TYPES);
const RECURRING_CYCLE_SET = new Set(SUPPORTED_RECURRING_CYCLES);

export const isSupportedRecurringCycle = (
  value: string,
): value is SupportedRecurringCycle =>
  RECURRING_CYCLE_SET.has(value as SupportedRecurringCycle);

export const normalizeRecurringCycle = (
  value: string | null | undefined,
): RecurringCycle | undefined => {
  if (!value) {
    return undefined;
  }
  if (isSupportedRecurringCycle(value)) {
    return value;
  }
  return "custom";
};

export const normalizePlanCategory = (
  value: string | null | undefined,
): PlanCategory => {
  if (!value) {
    return "custom";
  }
  if (PLAN_CATEGORY_SET.has(value as PlanCategory)) {
    return value as PlanCategory;
  }
  return "custom";
};

export const normalizeBillingType = (
  value: string | null | undefined,
): BillingType => {
  if (!value) {
    return "custom";
  }
  if (BILLING_TYPE_SET.has(value as BillingType)) {
    return value as BillingType;
  }
  return "custom";
};

export const normalizePlanCatalog = (
  catalog: PlanCatalog | null | undefined,
): PlanCatalog | undefined => {
  if (!catalog) {
    return undefined;
  }
  return {
    ...catalog,
    plans: catalog.plans.map((plan) => ({
      ...plan,
      category: normalizePlanCategory(plan.category),
      billingType: normalizeBillingType(plan.billingType),
      billingCycles: (plan.billingCycles ?? [])
        .map((cycle) => normalizeRecurringCycle(cycle))
        .flatMap((cycle) => (cycle ? [cycle] : [])),
    })),
  };
};

export const findPlanById = (
  catalog: PlanCatalog | undefined,
  planId: string,
): PlanCatalogEntry | undefined => {
  if (!catalog) {
    return undefined;
  }
  return catalog.plans.find((plan) => plan.planId === planId);
};

export const findPlanByProductId = (
  catalog: PlanCatalog | undefined,
  productId: string | undefined,
): PlanCatalogEntry | undefined => {
  if (!catalog || !productId) {
    return undefined;
  }
  return catalog.plans.find((plan) =>
    Object.values(plan.creemProductIds ?? {}).includes(productId),
  );
};
