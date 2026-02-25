import { Creem } from "creem";

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server.js";
import schema from "./schema.js";
import { asyncMap } from "convex-helpers";
import { api } from "./_generated/api.js";
import { convertToDatabaseProduct } from "./util.js";

export const getCustomerByEntityId = query({
  args: {
    entityId: v.string(),
  },
  returns: v.union(schema.tables.customers.validator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    return omitSystemFields(customer);
  },
});

export const insertCustomer = mutation({
  args: schema.tables.customers.validator,
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (existingCustomer) {
      // Enrich existing customer record with any new fields
      const patch: Record<string, unknown> = {};
      if (args.email && !existingCustomer.email) patch.email = args.email;
      if (args.name && !existingCustomer.name) patch.name = args.name;
      if (args.country && !existingCustomer.country) patch.country = args.country;
      if (args.mode) patch.mode = args.mode;
      if (args.updatedAt) patch.updatedAt = args.updatedAt;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existingCustomer._id, patch);
      }
      return existingCustomer._id;
    }
    return ctx.db.insert("customers", args);
  },
});

export const getSubscription = query({
  args: {
    id: v.string(),
  },
  returns: v.union(schema.tables.subscriptions.validator, v.null()),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.id))
      .unique();
    return omitSystemFields(subscription);
  },
});

export const getProduct = query({
  args: {
    id: v.string(),
  },
  returns: v.union(schema.tables.products.validator, v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", args.id))
      .unique();
    return omitSystemFields(product);
  },
});

/** For apps that have 0 or 1 active subscription per user. Excludes expired trials. */
export const getCurrentSubscription = query({
  args: {
    entityId: v.string(),
  },
  returns: v.union(
    v.object({
      ...schema.tables.subscriptions.validator.fields,
      product: schema.tables.products.validator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return null;
    }
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("customerId_endedAt", (q) =>
        q.eq("customerId", customer.id).eq("endedAt", null),
      )
      .first();
    if (!subscription) {
      return null;
    }
    if (
      subscription.status === "trialing" &&
      subscription.trialEnd &&
      subscription.trialEnd <= new Date().toISOString()
    ) {
      return null;
    }
    const product = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", subscription.productId))
      .unique();
    if (!product) {
      throw new Error(`Product not found: ${subscription.productId}`);
    }
    return {
      ...omitSystemFields(subscription),
      product: omitSystemFields(product),
    };
  },
});

/** List active subscriptions for a user, excluding ended and expired trials. */
export const listUserSubscriptions = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(
    v.object({
      ...schema.tables.subscriptions.validator.fields,
      product: v.union(schema.tables.products.validator, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return [];
    }
    const now = new Date().toISOString();
    const subscriptions = await asyncMap(
      ctx.db
        .query("subscriptions")
        .withIndex("customerId", (q) => q.eq("customerId", customer.id))
        .collect(),
      async (subscription) => {
        if (
          (subscription.endedAt && subscription.endedAt <= now) ||
          (subscription.status === "trialing" &&
            subscription.trialEnd &&
            subscription.trialEnd <= now)
        ) {
          return;
        }
        const product = subscription.productId
          ? (await ctx.db
              .query("products")
              .withIndex("id", (q) => q.eq("id", subscription.productId))
              .unique()) || null
          : null;
        return {
          ...omitSystemFields(subscription),
          product: omitSystemFields(product),
        };
      },
    );
    return subscriptions.flatMap((subscription) =>
      subscription ? [subscription] : [],
    );
  },
});

/** Returns all subscriptions for a user, including ended and expired trials. */
export const listAllUserSubscriptions = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(
    v.object({
      ...schema.tables.subscriptions.validator.fields,
      product: v.union(schema.tables.products.validator, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return [];
    }
    const subscriptions = await asyncMap(
      ctx.db
        .query("subscriptions")
        .withIndex("customerId", (q) => q.eq("customerId", customer.id))
        .collect(),
      async (subscription) => {
        const product = subscription.productId
          ? (await ctx.db
              .query("products")
              .withIndex("id", (q) => q.eq("id", subscription.productId))
              .unique()) || null
          : null;
        return {
          ...omitSystemFields(subscription),
          product: omitSystemFields(product),
        };
      },
    );
    return subscriptions;
  },
});

export const listProducts = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  returns: v.array(schema.tables.products.validator),
  handler: async (ctx, args) => {
    const q = ctx.db.query("products");
    const products = args.includeArchived
      ? await q.collect()
      : await q
          .withIndex("status", (q) => q.eq("status", "active"))
          .collect();
    return products.map((product) => omitSystemFields(product));
  },
});

export const createSubscription = mutation({
  args: {
    subscription: schema.tables.subscriptions.validator,
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.subscription.id))
      .unique();
    if (!existingSubscription) {
      await ctx.db.insert("subscriptions", args.subscription);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.subscription.modifiedAt ?? "";
    const existingModifiedAt = existingSubscription.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingSubscription._id, args.subscription);
  },
});

export const updateSubscription = mutation({
  args: {
    subscription: schema.tables.subscriptions.validator,
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.subscription.id))
      .unique();
    if (!existingSubscription) {
      // Subscription doesn't exist yet — insert instead of throwing
      await ctx.db.insert("subscriptions", args.subscription);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.subscription.modifiedAt ?? "";
    const existingModifiedAt = existingSubscription.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingSubscription._id, args.subscription);
  },
});

export const createProduct = mutation({
  args: {
    product: schema.tables.products.validator,
  },
  handler: async (ctx, args) => {
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", args.product.id))
      .unique();
    if (!existingProduct) {
      await ctx.db.insert("products", args.product);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.product.modifiedAt ?? "";
    const existingModifiedAt = existingProduct.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingProduct._id, args.product);
  },
});

export const updateProduct = mutation({
  args: {
    product: schema.tables.products.validator,
  },
  handler: async (ctx, args) => {
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", args.product.id))
      .unique();
    if (!existingProduct) {
      // Product doesn't exist yet — insert instead of throwing
      await ctx.db.insert("products", args.product);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.product.modifiedAt ?? "";
    const existingModifiedAt = existingProduct.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingProduct._id, args.product);
  },
});

export const createOrder = mutation({
  args: {
    order: schema.tables.orders.validator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("orders")
      .withIndex("id", (q) => q.eq("id", args.order.id))
      .unique();
    if (!existing) {
      await ctx.db.insert("orders", args.order);
      return;
    }
    // Update if incoming is newer
    if ((args.order.updatedAt ?? "") >= (existing.updatedAt ?? "")) {
      await ctx.db.patch(existing._id, args.order);
    }
  },
});

/** List paid one-time orders for a user. */
export const listUserOrders = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(schema.tables.orders.validator),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return [];
    }
    const orders = await ctx.db
      .query("orders")
      .withIndex("customerId", (q) => q.eq("customerId", customer.id))
      .collect();
    return orders
      .filter((o) => o.status === "paid" && o.type === "onetime")
      .map(omitSystemFields);
  },
});

export const listCustomerSubscriptions = query({
  args: {
    customerId: v.string(),
  },
  returns: v.array(schema.tables.subscriptions.validator),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("customerId", (q) => q.eq("customerId", args.customerId))
      .collect();
    return subscriptions.map(omitSystemFields);
  },
});

export const syncProducts = action({
  args: {
    apiKey: v.string(),
    serverIdx: v.optional(v.number()),
    serverURL: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const creem = new Creem({
      apiKey: args.apiKey,
      ...(args.serverIdx !== undefined ? { serverIdx: args.serverIdx } : {}),
      ...(args.serverURL ? { serverURL: args.serverURL } : {}),
    });
    let pageNumber = 1;
    let isDone = false;
    do {
      const products = await creem.products.search(pageNumber, 100);
      pageNumber += 1;
      isDone =
        products.pagination.currentPage >= products.pagination.totalPages;
      await ctx.runMutation(api.lib.updateProducts, {
        products: products.items.map(convertToDatabaseProduct),
      });
    } while (!isDone);
  },
});

export const updateProducts = mutation({
  args: {
    products: v.array(schema.tables.products.validator),
  },
  handler: async (ctx, args) => {
    await asyncMap(args.products, async (product) => {
      const existingProduct = await ctx.db
        .query("products")
        .withIndex("id", (q) => q.eq("id", product.id))
        .unique();
      if (existingProduct) {
        await ctx.db.patch(existingProduct._id, product);
        return;
      }
      await ctx.db.insert("products", product);
    });
  },
});

export const omitSystemFields = <
  T extends { _id: string; _creationTime: number } | null | undefined,
>(
  doc: T,
) => {
  if (!doc) {
    return doc;
  }
  const { _id, _creationTime, ...rest } = doc;
  return rest;
};
