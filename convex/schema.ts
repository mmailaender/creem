import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
  }),
  entitlements: defineTable({
    userId: v.id("users"),
    productId: v.string(),
    mode: v.union(v.literal("lifetime"), v.literal("consumable")),
    quantity: v.optional(v.number()),
    source: v.optional(v.string()),
    updatedAt: v.string(),
  })
    .index("userId", ["userId"])
    .index("userId_productId", ["userId", "productId"]),
  todos: defineTable({
    userId: v.id("users"),
    text: v.string(),
    completed: v.boolean(),
  }).index("userId", ["userId"]),
});
