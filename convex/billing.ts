import { Creem } from "@mmailaender/convex-creem";
import { api, components } from "./_generated/api";
import { internalAction, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
