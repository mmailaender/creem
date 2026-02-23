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
  basicMonthly: "prod_3tqZFdQNMukL0AevNgjH03",
  basicYearly: "prod_4uNmv0F22pqaDQL8xnI5hA",
  premiumMonthly: "prod_3tqZFdQNMukL0AevNgjH03",
  premiumYearly: "prod_4uNmv0F22pqaDQL8xnI5hA",
  premiumPlusMonthly: "prod_3tqZFdQNMukL0AevNgjH03",
  premiumPlusYearly: "prod_Cb7ydeGmcxuC383ItErhf",
  creditsPack: "prod_6qIqmMqX49oO25XGUAFpyR",
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
        "every-month": configuredProductIds.basicMonthly,
        "every-year": configuredProductIds.basicYearly,
        default: configuredProductIds.basicMonthly,
      },
    },
    {
      planId: "premium",
      type: "seat-based",
      displayName: "Premium",
      description: "Advanced subscription plan.",
      productIds: {
        "every-month": configuredProductIds.premiumPlusMonthly,
        "every-year": configuredProductIds.premiumPlusYearly,
        default: configuredProductIds.premiumPlusMonthly,
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
      groupId: "credits-pack",
      exclusive: true,
      items: [
        {
          productId: configuredProductIds.creditsPack,
          type: "one-time",
          displayName: "Credits Pack",
        },
      ],
      transitions: [],
    },
  ],
  entitlementRules: [
    {
      productId: configuredProductIds.creditsPack,
      mode: "consumable",
      grants: ["credits"],
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
        policy: billingPolicy,
      };
    }

    const [billingSnapshot, ownedProductIds] = await Promise.all([
      creem.getBillingSnapshot(ctx, { userId: user._id }),
      listOwnedProductIds(ctx, user._id),
    ]);

    return {
      user,
      billingSnapshot,
      configuredProducts,
      allProducts,
      ownedProductIds,
      subscriptionProductId: user.subscription?.productId ?? null,
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
  const productKey = subscription?.productKey;
  const isPremium =
    productKey === "premiumMonthly" || productKey === "premiumYearly";
  const isPremiumPlus =
    productKey === "premiumPlusMonthly" || productKey === "premiumPlusYearly";
  return {
    ...user,
    isFree: !isPremium && !isPremiumPlus,
    isPremium,
    isPremiumPlus,
    isTrialing: subscription?.status === "trialing",
    trialEnd: subscription?.trialEnd ?? null,
    subscription,
    maxTodos: isPremiumPlus
      ? undefined
      : isPremium
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

    const userId = await ctx.db.insert("users", {
      email: "user@example.com",
    });
    return {
      _id: userId,
      email: "user@example.com",
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
    const productKey = user.subscription?.productKey;
    if (!productKey && todoCount >= MAX_FREE_TODOS) {
      throw new Error("Reached maximum number of todos for free plan");
    }
    if (
      (productKey === "premiumMonthly" || productKey === "premiumYearly") &&
      todoCount >= MAX_PREMIUM_TODOS
    ) {
      throw new Error("Reached maximum number of todos for premium plan");
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
