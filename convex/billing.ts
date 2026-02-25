import { Creem } from "@mmailaender/creem";
import type { PlanCatalog } from "@mmailaender/creem";
import { api, components } from "./_generated/api";
import { internalAction, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const configuredProductIds = {
  // Subscriptions with trial (4 cycles)
  basicTrialMonthly: "prod_4if4apw1SzOXSUAfGL0Jp9",
  basicTrialQuarterly: "prod_5SxwV6WbbluzUQ2FmZ4trD",
  basicTrialSemiAnnual: "prod_7Lhs8en6kiBONIywQUlaQC",
  basicTrialYearly: "prod_KE9mMfH58482NIbKgK4nF",
  premiumTrialMonthly: "prod_7Cukw2hVIT5DvozmomK67A",
  premiumTrialQuarterly: "prod_7V5gRIqWgui5wQflemUBOF",
  premiumTrialSemiAnnual: "prod_4JN9cHsEto3dr0CQpgCxn4",
  premiumTrialYearly: "prod_6ytx0cFhBvgXLp1jA6CQqH",
  // Subscriptions without trial (monthly only)
  basicNoTrialMonthly: "prod_53CU7duHB58lGTUqKlRroI",
  premiumNoTrialMonthly: "prod_3ymOe55fDzKgmPoZnPEOBq",
  // Seat-based subscriptions (monthly, no trial)
  basicSeatMonthly: "prod_1c6ZGcxekHKrVYuWriHs68",
  premiumSeatMonthly: "prod_3861b06bJDnvpEBcs2uxYv",
  // One-time purchase
  oneTimeLicense: "prod_6npEfkzgtr9hSqdWd7fqKG",
  // Exclusive product group with upgrade
  groupBasic: "prod_4Di7Lkhf3TXy4UOKsUrGw0",
  groupPremium: "prod_56sJIyL7piLCVv270n4KBz",
  groupBasicToPremium: "prod_5LApsYRX8dHbx8QuLJgJ3j",
  // Repeating (consumable) product
  creditTopUp: "prod_73CnZ794MaJ1DUn8MU0O5f",
} as const;

// Single source of truth for subscription plans.
// Flows to both the billing resolver and the UI widgets via the Creem constructor.
const planCatalog: PlanCatalog = {
  version: "1",
  defaultPlanId: "free",
  plans: [
    {
      planId: "free",
      category: "free",
    },
    {
      planId: "basic",
      category: "paid",
      billingType: "recurring",
      creemProductIds: {
        "every-month": configuredProductIds.basicTrialMonthly,
        "every-three-months": configuredProductIds.basicTrialQuarterly,
        "every-six-months": configuredProductIds.basicTrialSemiAnnual,
        "every-year": configuredProductIds.basicTrialYearly,
      },
      billingCycles: [
        "every-month",
        "every-three-months",
        "every-six-months",
        "every-year",
      ],
    },
    {
      planId: "premium",
      category: "paid",
      billingType: "recurring",
      recommended: true,
      creemProductIds: {
        "every-month": configuredProductIds.premiumTrialMonthly,
        "every-three-months": configuredProductIds.premiumTrialQuarterly,
        "every-six-months": configuredProductIds.premiumTrialSemiAnnual,
        "every-year": configuredProductIds.premiumTrialYearly,
      },
      billingCycles: [
        "every-month",
        "every-three-months",
        "every-six-months",
        "every-year",
      ],
    },
    {
      planId: "enterprise",
      category: "enterprise",
    },
  ],
};

// User query to use in the Creem component
export const getUserInfo = query({
  args: {},
  handler: async (ctx) => {
    // This would be replaced with an actual auth query,
    // eg., ctx.auth.getUserIdentity() or getAuthUserId(ctx)
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },
});

export const creem = new Creem(components.creem, {
  products: configuredProductIds,
  getUserInfo: async (ctx) => {
    const user: { _id: Id<"users">; email: string } = await ctx.runQuery(
      api.billing.getUserInfo,
    );
    return {
      userId: user._id,
      email: user.email,
    };
  },
  planCatalog,

  // These can be configured in code or via environment variables
  // Uncomment and replace with actual values to configure in code:
  // apiKey: "your_creem_api_key", // Uses CREEM_API_KEY env var by default
  // webhookSecret: "your_webhook_secret", // Uses CREEM_WEBHOOK_SECRET env var by default
  // serverIdx: 0, // Default 0, can be also set via CREEM_SERVER_IDX env var
  // serverURL: "https://test-api.creem.io", // Optional, can be also set via CREEM_SERVER_URL env var
});

export const {
  // ── Core queries ─────────────────────────────────────────────
  // Keyed product map (based on products configured in the constructor).
  getConfiguredProducts,
  // All active products synced from Creem.
  listAllProducts,
  // Resolved billing state for UI banners and gates.
  getCurrentBillingSnapshot,
  // Full billing UI model for connected widgets (subscriptions, products, snapshot, catalog).
  getBillingUiModel,

  // ── Checkout & portal actions ────────────────────────────────
  generateCheckoutLink,
  generateCustomerPortalUrl,

  // ── Subscription management actions ──────────────────────────
  changeCurrentSubscription,
  updateSubscriptionSeats,
  cancelCurrentSubscription,
  resumeCurrentSubscription,
  pauseCurrentSubscription,

  // ── Primitive queries (for custom UIs) ───────────────────────
  getProduct,
  getSubscription,
  getCustomer,
  listSubscriptions,
  listOrders,

  // ── Full Creem API pass-through actions ──────────────────────
  createCreemProduct,
  retrieveCheckout,
  getTransaction,
  listTransactions,
  activateLicense,
  validateLicense,
  deactivateLicense,
  createDiscount,
  getDiscount,
  deleteDiscount,
} = creem.api();

export const syncBillingProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await creem.syncProducts(ctx);
    return { synced: true };
  },
});
