# Convex Creem Component

Add subscriptions and billing to your Convex app with [Creem](https://www.creem.io).

**Check out the [example app](example) for a complete integration.**

## Installation

```bash
npm install @convex-dev/creem
```

Create `convex/convex.config.ts` and register the component:

```ts
import { defineApp } from "convex/server";
import creem from "@convex-dev/creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
```

## Required environment variables

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_secret>
```

Optional:

```bash
npx convex env set CREEM_SERVER_IDX <index>
npx convex env set CREEM_SERVER_URL <url>
```

## Backend setup

Create a client in your Convex backend:

```ts
import { Creem } from "@convex-dev/creem";
import { api, components } from "./_generated/api";

export const creem = new Creem(components.creem, {
  getUserInfo: async (ctx) => {
    const user = await ctx.runQuery(api.users.currentUser);
    return { userId: user._id, email: user.email };
  },
  products: {
    premiumMonthly: "prod_monthly_id",
    premiumYearly: "prod_yearly_id",
  },
});

export const {
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
  changeCurrentSubscription,
  cancelCurrentSubscription,
} = creem.api();
```

## Webhooks

Register webhook routes in `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { creem } from "./example";

const http = httpRouter();

creem.registerRoutes(http, {
  path: "/creem/events",
  events: {
    "subscription.updated": async (_ctx, event) => {
      console.log("subscription updated", event.type ?? event.eventType);
    },
    "checkout.completed": async (_ctx, event) => {
      console.log("checkout completed", event.type ?? event.eventType);
    },
  },
});

export default http;
```

Use your Convex site URL plus `/creem/events` as the Creem webhook endpoint.

## React components

```tsx
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/creem/react";
import { api } from "../convex/_generated/api";

<CheckoutLink
  creemApi={{ generateCheckoutLink: api.example.generateCheckoutLink }}
  productId={products.premiumMonthly.id}
>
  Upgrade
</CheckoutLink>

<CustomerPortalLink
  creemApi={{
    generateCustomerPortalUrl: api.example.generateCustomerPortalUrl,
  }}
>
  Manage Subscription
</CustomerPortalLink>
```

### `CheckoutLink` props

- `creemApi`: object exposing `generateCheckoutLink`
- `productId`: Creem product ID
- `units?`: number of units
- `metadata?`: key-value metadata
- `lazy?`: generate URL on click instead of mount
- `className?`: optional class name

### `CustomerPortalLink` props

- `creemApi`: object exposing `generateCustomerPortalUrl`
- `children`: link content
- `className?`: optional class name

## API surface

The `Creem` client provides:

- `getCurrentSubscription(ctx, { userId })`
- `listAllUserSubscriptions(ctx, { userId })`
- `listProducts(ctx)`
- `getProduct(ctx, { productId })`
- `getCustomerByUserId(ctx, userId)`
- `syncProducts(ctx)`
- `changeSubscription(ctx, { productId })`
- `cancelSubscription(ctx, { revokeImmediately? })`
- `registerRoutes(http, { path?, events? })`

And action/query wrappers via `creem.api()`:

- `changeCurrentSubscription`
- `cancelCurrentSubscription`
- `getConfiguredProducts`
- `listAllProducts`
- `listAllSubscriptions`
- `generateCheckoutLink`
- `generateCustomerPortalUrl`
