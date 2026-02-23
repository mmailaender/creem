import type {
  AvailableAction,
  BillingSnapshot,
  OneTimePaymentStatus,
} from "./types.js";

const TERMINAL_PAYMENT_STATUSES = new Set<OneTimePaymentStatus>([
  "paid",
  "refunded",
  "partially_refunded",
]);

export const hasBillingAction = (
  snapshot: BillingSnapshot,
  action: AvailableAction,
) => snapshot.availableActions.includes(action);

export const isOneTimeBilling = (snapshot: BillingSnapshot) =>
  snapshot.billingType === "onetime";

export const isEnterpriseBilling = (snapshot: BillingSnapshot) =>
  snapshot.activeCategory === "enterprise";

export const shouldShowBillingCycleToggle = (snapshot: BillingSnapshot) =>
  snapshot.billingType === "recurring" &&
  snapshot.availableBillingCycles.length > 1 &&
  hasBillingAction(snapshot, "switch_interval");

export const isTerminalPaymentStatus = (status: OneTimePaymentStatus) =>
  TERMINAL_PAYMENT_STATUSES.has(status);
