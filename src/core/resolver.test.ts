import { describe, expect, it } from "vitest";
import { resolveBillingSnapshot } from "./resolver.js";

describe("resolveBillingSnapshot", () => {
  it("maps recurring subscription intervals and seat actions", () => {
    const snapshot = resolveBillingSnapshot({
      catalog: {
        version: "1",
        plans: [
          {
            planId: "pro",
            category: "paid",
            displayName: "Pro",
            billingType: "recurring",
            billingCycles: ["every-month", "every-year"],
            pricingModel: "seat",
            creemProductIds: {
              monthly: "prod_monthly",
              yearly: "prod_yearly",
            },
          },
        ],
      },
      currentSubscription: {
        productId: "prod_monthly",
        status: "active",
        recurringInterval: "every-month",
        seats: 5,
      },
    });

    expect(snapshot.activePlanId).toBe("pro");
    expect(snapshot.recurringCycle).toBe("every-month");
    expect(snapshot.availableActions).toContain("switch_interval");
    expect(snapshot.availableActions).toContain("update_seats");
  });

  it("supports one-time payments", () => {
    const snapshot = resolveBillingSnapshot({
      catalog: {
        version: "1",
        plans: [
          {
            planId: "credits",
            category: "paid",
            billingType: "onetime",
            displayName: "Credits",
            creemProductIds: { default: "prod_credits" },
          },
        ],
      },
      payment: {
        status: "pending",
        productId: "prod_credits",
      },
    });

    expect(snapshot.billingType).toBe("onetime");
    expect(snapshot.payment?.status).toBe("pending");
    expect(snapshot.availableActions).toEqual(["checkout"]);
  });

  it("falls back to custom category when no catalog mapping exists", () => {
    const snapshot = resolveBillingSnapshot({
      currentSubscription: {
        status: "unpaid",
      },
    });

    expect(snapshot.activeCategory).toBe("custom");
    expect(snapshot.availableActions).toEqual(["portal"]);
  });
});
