# Convex Creem Component

Add subscriptions and billing to your Convex app with [Creem](https://www.creem.io).

**Check out the [React example app](example) and [Svelte example app](example-svelte) for complete integrations.**

## Installation

```bash
npm install @mmailaender/creem
```

## Run local examples

```bash
# React example
pnpm dev:react

# Svelte example
pnpm dev:svelte
```

Create `convex/convex.config.ts` and register the component:

```ts
import { defineApp } from "convex/server";
import creem from "@mmailaender/creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
```

## Environment variables

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
```

Webhook verification (only needed if you use `creem.registerRoutes(...)`):

```bash
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_signing_secret>
```

## Backend setup

Create a client in your Convex backend:

```ts
import { Creem } from "@mmailaender/creem";
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
  getPlanCatalog: async () => ({
    version: "2026-02",
    plans: [
      {
        planId: "free",
        category: "free",
        billingType: "custom",
        displayName: "Free",
      },
      {
        planId: "pro",
        category: "paid",
        billingType: "recurring",
        displayName: "Pro",
        billingCycles: ["every-month", "every-three-months", "every-six-months", "every-year"],
        creemProductIds: {
          monthly: "prod_monthly_id",
          quarterly: "prod_three_months_id",
          halfYear: "prod_six_months_id",
          yearly: "prod_yearly_id",
        },
      },
      {
        planId: "credits",
        category: "paid",
        billingType: "onetime",
        displayName: "Credits Pack",
        creemProductIds: { default: "prod_onetime_id" },
      },
    ],
    defaultPlanId: "free",
  }),
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

> Creem recurring cycles supported by this package: `every-month`, `every-three-months`, `every-six-months`, `every-year`.

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

## Advanced: server endpoint overrides

Only use these if you need to force a non-default API endpoint (for example test/staging).

```bash
# Use exactly one of these two options:
npx convex env set CREEM_SERVER_IDX <index>
npx convex env set CREEM_SERVER_URL <url>
```

- `CREEM_SERVER_IDX`: uses the Creem SDK's predefined server list by index.
- `CREEM_SERVER_URL`: explicit base URL override (for example `https://test-api.creem.io`).

If you don't need endpoint overrides, leave both unset.

## React components

```tsx
import {
  BillingGate,
  BillingToggle,
  CheckoutButton,
  CheckoutLink,
  CustomerPortalButton,
  CustomerPortalLink,
  OneTimeCheckoutButton,
  OneTimeCheckoutLink,
  PricingCard,
  PricingSection,
  ScheduledChangeBanner,
  PaymentWarningBanner,
  TrialLimitBanner,
  CheckoutSuccessSummary,
  OneTimePaymentStatusBadge,
  useCheckoutSuccessParams,
} from "@mmailaender/creem/react";
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

<OneTimeCheckoutLink
  creemApi={{ generateCheckoutLink: api.example.generateCheckoutLink }}
  productId={products.credits.id}
>
  Buy Credits
</OneTimeCheckoutLink>

function SuccessPage() {
  const params = useCheckoutSuccessParams();
  return (
    <>
      <CheckoutSuccessSummary params={params} />
      <OneTimePaymentStatusBadge status="pending" />
    </>
  );
}
```

The React package exports:

- `CheckoutLink`, `OneTimeCheckoutLink`
- `CheckoutButton`, `OneTimeCheckoutButton`
- `CustomerPortalLink`, `CustomerPortalButton`
- `BillingToggle`, `PricingCard`, `PricingSection`, `BillingGate`
- `ScheduledChangeBanner`, `PaymentWarningBanner`, `TrialLimitBanner`
- `CheckoutSuccessSummary`, `OneTimePaymentStatusBadge`, `useCheckoutSuccessParams`

## Svelte components

```svelte
<script lang="ts">
  import {
    BillingGate,
    BillingToggle,
    CheckoutButton,
    CheckoutSuccessSummary,
    CustomerPortalButton,
    OneTimeCheckoutButton,
    OneTimePaymentStatusBadge,
    PaymentWarningBanner,
    PricingCard,
    PricingSection,
    ScheduledChangeBanner,
    TrialLimitBanner,
    type BillingSnapshot,
    type PlanCatalogEntry,
  } from "@mmailaender/creem/svelte";

  let selectedCycle = $state("every-month");
  const snapshot: BillingSnapshot = {
    resolvedAt: new Date().toISOString(),
    activePlanId: null,
    activeCategory: "free",
    billingType: "custom",
    availableBillingCycles: ["every-month", "every-year"],
    payment: null,
    availableActions: ["checkout"],
  };
  const plans: PlanCatalogEntry[] = [];
</script>

<BillingToggle
  cycles={["every-month", "every-year"]}
  value={selectedCycle}
  onValueChange={(cycle) => (selectedCycle = cycle)}
/>

<CheckoutButton productId="prod_123">Upgrade</CheckoutButton>
<OneTimeCheckoutButton productId="prod_one_time">Buy now</OneTimeCheckoutButton>
<CustomerPortalButton href="https://example.com/portal" />

<TrialLimitBanner {snapshot} />
<ScheduledChangeBanner {snapshot} />
<PaymentWarningBanner {snapshot} />
<OneTimePaymentStatusBadge status="pending" />

<BillingGate {snapshot} requiredActions="checkout">
  <p>Allowed by billing policy.</p>
  {#snippet fallback()}
    <p>Billing action required.</p>
  {/snippet}
</BillingGate>

<PricingCard plan={plans[0]} />
<PricingSection {plans} {snapshot} {selectedCycle} />
<CheckoutSuccessSummary search={window.location.search} />
```

Svelte components use Svelte 5 runes and snippet rendering (`{@render ...}`) internally.

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

### One-time payment React helpers

- `OneTimeCheckoutLink`: alias of `CheckoutLink` for one-time product UX
- `useCheckoutSuccessParams`: parses `checkout_id`, `order_id`, `customer_id`, `product_id`, `request_id`, `signature` from URL search params
- `CheckoutSuccessSummary`: lightweight success-page summary component
- `OneTimePaymentStatusBadge`: status label helper for `pending | paid | refunded | partially_refunded`

## API surface

The `Creem` client provides:

- `getCurrentSubscription(ctx, { userId })`
- `listAllUserSubscriptions(ctx, { userId })`
- `listProducts(ctx)`
- `getProduct(ctx, { productId })`
- `getCustomerByUserId(ctx, userId)`
- `syncProducts(ctx)`
- `getBillingSnapshot(ctx, { userId, payment? })`
- `changeSubscription(ctx, { productId })`
- `cancelSubscription(ctx, { revokeImmediately? })`
- `registerRoutes(http, { path?, events? })`

And action/query wrappers via `creem.api()`:

- `changeCurrentSubscription`
- `cancelCurrentSubscription`
- `getConfiguredProducts`
- `listAllProducts`
- `listAllSubscriptions`
- `getCurrentBillingSnapshot`
- `generateCheckoutLink`
- `generateCustomerPortalUrl`
