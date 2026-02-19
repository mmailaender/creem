import { httpRouter } from "convex/server";
import { creem } from "./example";

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
      const data = (event.data ?? event.object) as { id?: string } | undefined;
      console.log("Checkout completed", data?.id);
    },
  },
});

export default http;
