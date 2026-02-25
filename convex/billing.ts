import { Creem } from "@mmailaender/convex-creem";
import type { PlanCatalog } from "@mmailaender/convex-creem";
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

// User query to use in the Creem component.
// For organization billing, return billingEntityId (e.g. the org ID).
// If omitted, userId is used as the billing entity.
export const getUserInfo = query({
  args: {},
  handler: async (ctx) => {
    // Replace with your auth query, e.g. ctx.auth.getUserIdentity()
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new Error("User not found");
    }
    return {
      ...user,
      // For org billing, resolve the active org and return its ID:
      // billingEntityId: user.activeOrgId ?? undefined,
    };
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
      // Pass billingEntityId for org billing (optional):
      // billingEntityId: user.billingEntityId,
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

// ── Tier 1: Entity-scoped API (auto-resolves entityId via getUserInfo) ──
// These are safe to expose directly — they always operate on the
// authenticated user's (or org's) billing entity.
export const {
  // Core queries
  getConfiguredProducts,
  listAllProducts,
  getCurrentBillingSnapshot,
  getBillingUiModel,

  // Checkout & portal actions
  generateCheckoutLink,
  generateCustomerPortalUrl,

  // Subscription management (entity-scoped)
  changeCurrentSubscription,
  updateSubscriptionSeats,
  cancelCurrentSubscription,
  resumeCurrentSubscription,
  pauseCurrentSubscription,

  // Entity-scoped queries
  getProduct,
  getCustomer,
  listSubscriptions,
  listOrders,
} = creem.api();

// ── Tier 2: Cross-entity / admin operations (class methods) ─────────
// These require explicit entityId and are NOT in creem.api().
// Wrap them in your own mutations/actions with RBAC checks.
//
// Example: Admin-only subscription lookup
//   export const adminGetSubscription = query({
//     args: { entityId: v.string() },
//     handler: async (ctx, args) => {
//       // Your RBAC check here:
//       // const user = await getAuthUser(ctx);
//       // if (user.role !== "admin") throw new Error("Forbidden");
//       return await creem.getCurrentSubscription(ctx, { entityId: args.entityId });
//     },
//   });
//
// Available class methods for Tier 2:
//   creem.getCurrentSubscription(ctx, { entityId })
//   creem.listUserSubscriptions(ctx, { entityId })
//   creem.listAllUserSubscriptions(ctx, { entityId })
//   creem.listUserOrders(ctx, { entityId })
//   creem.getCustomerByEntityId(ctx, entityId)
//   creem.changeSubscription(ctx, { entityId, productId })
//   creem.updateSubscriptionSeats(ctx, { entityId, units })
//   creem.cancelSubscription(ctx, { entityId, revokeImmediately? })
//   creem.pauseSubscription(ctx, { entityId })
//   creem.resumeSubscription(ctx, { entityId })
//   creem.createCheckoutSession(ctx, { entityId, userId, email, productId, successUrl, ... })
//   creem.createCustomerPortalSession(ctx, { entityId })
//   creem.getBillingSnapshot(ctx, { entityId })
//   creem.buildBillingUiModel(ctx, { entityId })
//
// For Creem SDK pass-through (products, licenses, discounts, transactions),
// use creem.sdk.* directly in your own wrappers:
//   creem.sdk.products.create({ ... })
//   creem.sdk.licenses.activate({ ... })
//   creem.sdk.discounts.create({ ... })
//   creem.sdk.transactions.search(...)

export const syncBillingProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await creem.syncProducts(ctx);
    return { synced: true };
  },
});
