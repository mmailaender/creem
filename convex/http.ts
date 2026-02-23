import { httpRouter } from "convex/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { billingPolicy, creem } from "./billing";

const http = httpRouter();

creem.registerRoutes(http, {
  // Optional custom path, default is "/creem/events"
  path: "/creem/events",
  // Typesafe event handlers for any Creem webhook event.
  events: {
    "subscription.updated": async (ctx, event) => {
      console.log("Subscription updated", event);
      const data = (event.data ?? event.object) as
        | {
            customerCancellationReason?: string;
            customerCancellationComment?: string;
          }
        | undefined;
      if (data?.customerCancellationReason) {
        console.log(
          "Customer cancellation reason",
          data.customerCancellationReason
        );
        console.log(
          "Customer cancellation comment",
          data.customerCancellationComment
        );
      }
    },
    "checkout.completed": async (ctx, event) => {
      const data = (event.data ?? event.object) as
        | {
            id?: string;
            productId?: string;
            product?: { id?: string } | string;
            metadata?: Record<string, unknown>;
          }
        | undefined;
      const productId =
        data?.productId ??
        (typeof data?.product === "string" ? data.product : data?.product?.id);
      const convexUserId = data?.metadata?.["convexUserId"];
      console.log("Checkout completed", data?.id, productId);

      if (typeof convexUserId !== "string" || !productId) {
        return;
      }

      const entitlementRule = billingPolicy.entitlementRules.find(
        (rule) => rule.productId === productId,
      );

      if (!entitlementRule) {
        return;
      }

      await ctx.runMutation(api.billing.upsertEntitlementForUser, {
        userId: convexUserId as Id<"users">,
        productId,
        mode: entitlementRule.mode,
        source: "checkout.completed",
      });
    },
  },
});

export default http;
