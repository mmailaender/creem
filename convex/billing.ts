import { Creem } from "@mmailaender/creem";
import type { PlanCatalog } from "@mmailaender/creem";
import { api, components } from "./_generated/api";
import { MutationCtx, action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export type Transition =
  | { from: string; to: string; kind: "direct" }
  | {
      from: string;
      to: string;
      kind: "via_product";
      viaProductId: string;
    };

type BillingPolicy = {
  productGroups: Array<{
    groupId: string;
    exclusive: boolean;
    items: Array<{
      productId: string;
      type: "one-time" | "recurring";
      displayName?: string;
    }>;
    transitions: Transition[];
  }>;
  entitlementRules: Array<{
    productId: string;
    mode: "lifetime" | "consumable";
    grants: string[];
  }>;
};

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
      displayName: "Free",
      description: "Free plan with limited features.",
    },
    {
      planId: "basic",
      category: "paid",
      billingType: "recurring",
      pricingModel: "flat",
      displayName: "Basic",
      description: "Starter subscription plan.",
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
      pricingModel: "flat",
      displayName: "Premium",
      description: "Advanced subscription plan.",
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
      displayName: "Enterprise",
      description: "Custom enterprise contracts.",
    },
  ],
};

export const billingPolicy: BillingPolicy = {
  productGroups: [
    {
      groupId: "exclusive-upgrade",
      exclusive: true,
      items: [
        {
          productId: configuredProductIds.groupBasic,
          type: "one-time",
          displayName: "Basic",
        },
        {
          productId: configuredProductIds.groupPremium,
          type: "one-time",
          displayName: "Premium",
        },
      ],
      transitions: [
        {
          from: configuredProductIds.groupBasic,
          to: configuredProductIds.groupPremium,
          kind: "via_product" as const,
          viaProductId: configuredProductIds.groupBasicToPremium,
        },
      ],
    },
  ],
  entitlementRules: [
    {
      productId: configuredProductIds.oneTimeLicense,
      mode: "lifetime",
      grants: ["license"],
    },
    {
      productId: configuredProductIds.creditTopUp,
      mode: "consumable",
      grants: ["credits"],
    },
    {
      productId: configuredProductIds.groupBasic,
      mode: "lifetime",
      grants: ["group-basic"],
    },
    {
      productId: configuredProductIds.groupPremium,
      mode: "lifetime",
      grants: ["group-premium"],
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
      api.billing.getUserInfo
    );
    return {
      userId: user._id,
      email: user.email,
    };
  },
  planCatalog,
  cancelMode: "scheduled"

  // These can be configured in code or via environment variables
  // Uncomment and replace with actual values to configure in code:
  // apiKey: "your_creem_api_key", // Or use CREEM_API_KEY env var
  // webhookSecret: "your_webhook_secret", // Or use CREEM_WEBHOOK_SECRET env var
  // serverIdx: 0, // Optional, defaults to CREEM_SERVER_IDX env var when set
  // serverURL: "https://test-api.creem.io", // Optional, defaults to CREEM_SERVER_URL env var
});

export const {
  // If you configure your products by key in the Creem constructor,
  // this query provides a keyed object of the products.
  getConfiguredProducts,

  // Lists all non-archived products, useful if you don't configure products by key.
  listAllProducts,

  // Generates a checkout link for the given product ID.
  generateCheckoutLink,

  // Generates a customer portal URL for the current user.
  generateCustomerPortalUrl,

  // Changes the current subscription to the given product ID.
  changeCurrentSubscription,

  // Updates the seat count on the current subscription.
  updateSubscriptionSeats,

  // Cancels the current subscription.
  cancelCurrentSubscription,

  // Resumes a subscription in scheduled_cancel or paused state.
  resumeCurrentSubscription,

  // Resolves the current billing snapshot from Convex + plan catalog.
  getCurrentBillingSnapshot,

  // Returns the full billing UI model for connected widgets.
  // Override this with your own query using creem.buildBillingUiModel()
  // if you need app-specific fields (ownedProductIds, policy, etc.).
  getBillingUiModel,
} = creem.api();

export const syncBillingProducts = action({
  args: {},
  handler: async (ctx) => {
    await creem.syncProducts(ctx);
    return { synced: true };
  },
});

export const grantDemoEntitlement = mutation({
  args: {
    productId: v.string(),
    mode: v.optional(v.union(v.literal("lifetime"), v.literal("consumable"))),
    quantity: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new Error("No user found. Create a demo user first.");
    }

    return await upsertEntitlement(ctx, {
      userId: user._id,
      productId: args.productId,
      mode: args.mode ?? "lifetime",
      quantity: args.quantity,
      source: args.source ?? "manual",
    });
  },
});

export const upsertEntitlementForUser = mutation({
  args: {
    userId: v.id("users"),
    productId: v.string(),
    mode: v.optional(v.union(v.literal("lifetime"), v.literal("consumable"))),
    quantity: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertEntitlement(ctx, {
      userId: args.userId,
      productId: args.productId,
      mode: args.mode ?? "lifetime",
      quantity: args.quantity,
      source: args.source ?? "webhook",
    });
  },
});

const upsertEntitlement = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    productId: string;
    mode: "lifetime" | "consumable";
    quantity?: number;
    source?: string;
  },
) => {
  const existing = await ctx.db
    .query("entitlements")
    .withIndex("userId_productId", (q) =>
      q.eq("userId", args.userId).eq("productId", args.productId),
    )
    .unique();

  const payload = {
    userId: args.userId,
    productId: args.productId,
    mode: args.mode,
    quantity: args.quantity,
    source: args.source ?? "manual",
    updatedAt: new Date().toISOString(),
  } as const;

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return await ctx.db.insert("entitlements", payload);
};
