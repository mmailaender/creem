import { Creem } from "@mmailaender/creem";
import { api, components } from "./_generated/api";
import { MutationCtx, QueryCtx, action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type SubscriptionPlanType = "free" | "single" | "seat-based" | "enterprise";

export type Transition =
  | { from: string; to: string; kind: "direct" }
  | {
      from: string;
      to: string;
      kind: "via_product";
      viaProductId: string;
    };

type BillingPolicy = {
  subscriptionPlans: Array<{
    planId: string;
    type: SubscriptionPlanType;
    displayName: string;
    description?: string;
    productIds?: Record<string, string>;
  }>;
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

export const billingPolicy: BillingPolicy = {
  subscriptionPlans: [
    {
      planId: "free",
      type: "free",
      displayName: "Free",
      description: "Free plan with limited features.",
    },
    {
      planId: "basic",
      type: "single",
      displayName: "Basic",
      description: "Starter subscription plan.",
      productIds: {
        "every-month": configuredProductIds.basicTrialMonthly,
        "every-three-months": configuredProductIds.basicTrialQuarterly,
        "every-six-months": configuredProductIds.basicTrialSemiAnnual,
        "every-year": configuredProductIds.basicTrialYearly,
      },
    },
    {
      planId: "premium",
      type: "single",
      displayName: "Premium",
      description: "Advanced subscription plan.",
      productIds: {
        "every-month": configuredProductIds.premiumTrialMonthly,
        "every-three-months": configuredProductIds.premiumTrialQuarterly,
        "every-six-months": configuredProductIds.premiumTrialSemiAnnual,
        "every-year": configuredProductIds.premiumTrialYearly,
      },
    },
    {
      planId: "enterprise",
      type: "enterprise",
      displayName: "Enterprise",
      description: "Custom enterprise contracts.",
    },
  ],
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
    const user = await currentUser(ctx);
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

export const getBillingUiModel = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    const [configuredProducts, allProducts] = await Promise.all([
      getConfiguredProductMap(ctx),
      creem.listProducts(ctx),
    ]);

    if (!user) {
      return {
        user: null,
        billingSnapshot: null,
        configuredProducts,
        allProducts,
        ownedProductIds: [],
        subscriptionProductId: null,
        hasCreemCustomer: false,
        policy: billingPolicy,
      };
    }

    const [billingSnapshot, ownedProductIds, creemCustomer] = await Promise.all([
      creem.getBillingSnapshot(ctx, { userId: user._id }),
      listOwnedProductIds(ctx, user._id),
      creem.getCustomerByUserId(ctx, user._id),
    ]);

    return {
      user,
      billingSnapshot,
      configuredProducts,
      allProducts,
      ownedProductIds,
      subscriptionProductId: user.subscription?.productId ?? null,
      hasCreemCustomer: creemCustomer != null,
      policy: billingPolicy,
    };
  },
});

export const creem = new Creem(components.creem, {
  products: configuredProductIds,
  getUserInfo: async (ctx) => {
    const user: { _id: Id<"users">; email: string } = await ctx.runQuery(
      api.example.getUserInfo
    );
    return {
      userId: user._id,
      email: user.email,
    };
  },

  // These can be configured in code or via environment variables
  // Uncomment and replace with actual values to configure in code:
  // apiKey: "your_creem_api_key", // Or use CREEM_API_KEY env var
  // webhookSecret: "your_webhook_secret", // Or use CREEM_WEBHOOK_SECRET env var
  // serverIdx: 0, // Optional, defaults to CREEM_SERVER_IDX env var when set
  // serverURL: "https://test-api.creem.io", // Optional, defaults to CREEM_SERVER_URL env var
});

export const MAX_FREE_TODOS = 3;
export const MAX_PREMIUM_TODOS = 6;

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

  // Cancels the current subscription.
  cancelCurrentSubscription,

  // Resolves the current billing snapshot from Convex + plan catalog.
  getCurrentBillingSnapshot,
} = creem.api();

const getConfiguredProductMap = async (ctx: QueryCtx) => {
  const products = await creem.listProducts(ctx);
  return Object.fromEntries(
    Object.entries(creem.products).map(([key, productId]) => [
      key,
      products.find((product) => product.id === productId) ?? null,
    ]),
  );
};

const listOwnedProductIds = async (ctx: QueryCtx, userId: Id<"users">) => {
  const entitlements = await ctx.db
    .query("entitlements")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  return entitlements.map((entitlement) => entitlement.productId);
};

// In a real app you'll set up authentication, we just use a
// fake user for the example.
const currentUser = async (ctx: QueryCtx) => {
  const user = await ctx.db.query("users").first();
  if (!user) {
    return null;
  }
  const subscription = await creem.getCurrentSubscription(ctx, {
    userId: user._id,
  });
  const productKey = subscription?.productKey as string | undefined;
  const isPremium = productKey != null && productKey.startsWith("premium");
  const isBasic = productKey != null && productKey.startsWith("basic");
  return {
    ...user,
    isFree: !isPremium && !isBasic,
    isPremium,
    isBasic,
    isTrialing: subscription?.status === "trialing",
    trialEnd: subscription?.trialEnd ?? null,
    subscription,
    maxTodos: isPremium
      ? undefined
      : isBasic
        ? MAX_PREMIUM_TODOS
        : MAX_FREE_TODOS,
  };
};

// Query that returns our pseudo user.
export const getCurrentUser = query({
  handler: async (ctx) => {
    return currentUser(ctx);
  },
});

export const createDemoUser = mutation({
  args: {},
  handler: async (ctx) => {
    const existingUser = await ctx.db.query("users").first();
    if (existingUser) {
      return existingUser;
    }

    const email = process.env.TEST_USER_EMAIL;
    if (!email) {
      throw new Error("TEST_USER_EMAIL environment variable is not set");
    }

    const userId = await ctx.db.insert("users", {
      email,
    });
    return {
      _id: userId,
      email,
    };
  },
});

export const authorizeTodo = async (ctx: QueryCtx, todoId: Id<"todos">) => {
  const user = await currentUser(ctx);
  if (!user) {
    throw new Error("No user found");
  }
  const todo = await ctx.db.get(todoId);
  if (!todo || todo.userId !== user._id) {
    throw new Error("Todo not found");
  }
};

export const listTodos = query({
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) {
      return [];
    }
    return ctx.db
      .query("todos")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const insertTodo = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) {
      throw new Error("No user found. Create a demo user first.");
    }
    const todoCount = (
      await ctx.db
        .query("todos")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .collect()
    ).length;
    const productKey = user.subscription?.productKey as string | undefined;
    if (!productKey && todoCount >= MAX_FREE_TODOS) {
      throw new Error("Reached maximum number of todos for free plan");
    }
    if (
      productKey != null &&
      productKey.startsWith("basic") &&
      todoCount >= MAX_PREMIUM_TODOS
    ) {
      throw new Error("Reached maximum number of todos for basic plan");
    }
    await ctx.db.insert("todos", {
      userId: user._id,
      text: args.text,
      completed: false,
    });
  },
});

export const updateTodoText = mutation({
  args: {
    todoId: v.id("todos"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await authorizeTodo(ctx, args.todoId);
    await ctx.db.patch(args.todoId, { text: args.text });
  },
});

export const completeTodo = mutation({
  args: {
    todoId: v.id("todos"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    await authorizeTodo(ctx, args.todoId);
    await ctx.db.patch(args.todoId, { completed: args.completed });
  },
});

export const deleteTodo = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await authorizeTodo(ctx, args.todoId);
    await ctx.db.delete(args.todoId);
  },
});
