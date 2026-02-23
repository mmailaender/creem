import type { AvailableAction, BillingSnapshot, PlanCatalogEntry, RecurringCycle } from "../../core/types.js";

const CYCLE_KEY_ALIASES: Record<RecurringCycle, string[]> = {
  "every-month": ["every-month", "monthly", "month"],
  "every-three-months": ["every-three-months", "quarterly", "every-quarter"],
  "every-six-months": ["every-six-months", "semiannual", "semi-annually"],
  "every-year": ["every-year", "yearly", "annual"],
  custom: ["custom", "default"],
};

export const formatRecurringCycle = (cycle: RecurringCycle) => {
  if (cycle === "every-month") return "Monthly";
  if (cycle === "every-three-months") return "Quarterly";
  if (cycle === "every-six-months") return "Semi-annual";
  if (cycle === "every-year") return "Yearly";
  return "Custom";
};

export const resolveProductIdForPlan = (
  plan: PlanCatalogEntry,
  selectedCycle: RecurringCycle | undefined,
) => {
  const productIds = plan.creemProductIds;
  if (!productIds) {
    return undefined;
  }

  const aliases = selectedCycle
    ? CYCLE_KEY_ALIASES[selectedCycle]
    : CYCLE_KEY_ALIASES.custom;
  for (const alias of aliases) {
    if (productIds[alias]) {
      return productIds[alias];
    }
    const partial = Object.entries(productIds).find(([key]) =>
      key.toLowerCase().includes(alias),
    );
    if (partial) {
      return partial[1];
    }
  }

  return productIds.default ?? Object.values(productIds)[0];
};

export const hasBillingActionLocal = (
  snapshot: BillingSnapshot,
  action: AvailableAction,
) => snapshot.availableActions.includes(action);
