# Convex Creem Component

Add subscriptions, one-time purchases, and billing to your Convex app with
[Creem](https://www.creem.io).

**Check out the [React example](example) and [Svelte example](example-svelte)
for complete integrations.**

## Installation

```bash
npm install @mmailaender/creem
```

---

## 1. Project setup

Register the Creem component in `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import creem from "@mmailaender/creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
```

Set required environment variables:

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_signing_secret>
```

---

## 2. Backend setup

### Create the Creem client

```ts
// convex/billing.ts
import { Creem } from "@mmailaender/creem";
import { api, components } from "./_generated/api";

export const creem = new Creem(components.creem, {
  getUserInfo: async (ctx) => {
    const user = await ctx.runQuery(api.users.currentUser);
    return { userId: user._id, email: user.email };
  },
  products: {
    basicMonthly: "prod_xxx",
    basicYearly: "prod_yyy",
    premiumMonthly: "prod_zzz",
  },
  // Optional: define your plan catalog once here.
  // It flows to both the billing resolver and the UI widgets.
  planCatalog: {
    version: "1",
    defaultPlanId: "free",
    plans: [
      { planId: "free", category: "free" },
      {
        planId: "basic",
        category: "paid",
        billingType: "recurring",
        creemProductIds: {
          "every-month": "prod_xxx",
          "every-year": "prod_yyy",
        },
        billingCycles: ["every-month", "every-year"],
      },
    ],
  },
});
```

### Export API wrappers

`creem.api()` returns ready-to-use Convex query/action/mutation exports:

```ts
export const {
  getConfiguredProducts, // query  — keyed product map
  listAllProducts, // query  — all non-archived products
  getBillingUiModel, // query  — full billing state for connected widgets
  generateCheckoutLink, // action — creates a checkout URL
  generateCustomerPortalUrl, // action — customer billing portal
  changeCurrentSubscription, // action — switch subscription product
  cancelCurrentSubscription, // action — cancel subscription
  resumeCurrentSubscription, // action — resume subscription, if in scheduled_cancel or paused state
  getCurrentBillingSnapshot, // query  — resolved billing state
} = creem.api();
```

### Billing UI model

`getBillingUiModel` is included in `creem.api()` and returns the full billing
state for connected widgets. No manual query needed.

The model includes:
- **`activeSubscriptions`** — all non-ended subscriptions with product, status, seats, period info
- **`ownedProductIds`** — product IDs from paid one-time orders (derived from the `orders` table)
- **`billingSnapshot`** — resolved billing state for UI banners and gates
- **`planCatalog`** — your plan catalog config (if provided)

If you need app-specific fields, write your own query using the
`buildBillingUiModel` helper:

```ts
export const getCustomBillingModel = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return { user: null, billingSnapshot: null /* ... */ };

    const billingData = await creem.buildBillingUiModel(ctx, { userId: user._id });
    return { user, ...billingData, myCustomField: "value" };
  },
});
```

### Register webhooks

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { creem } from "./billing";

const http = httpRouter();

creem.registerRoutes(http, {
  path: "/creem/events",
  // The component automatically handles:
  // - checkout.completed → creates customer + subscription + order
  // - subscription.* → creates/updates subscription + customer
  // - product.* → creates/updates product
  // Add app-specific handlers below for app-specific logic:
  events: {
    "checkout.completed": async (ctx, event) => {
      // Send confirmation email, update user state, etc.
    },
  },
});

export default http;
```

Use your Convex site URL + `/creem/events` as the Creem webhook endpoint.

### Sync products

After configuring webhooks, sync your Creem products to the Convex database:

```bash
npx convex run billing:syncBillingProducts
```

This is an internal action and can only be triggered from the CLI or the Convex
dashboard (Functions → select "app" → `billing/syncBillingProducts`).

---

## 3. Frontend: Connected Svelte widgets

The connected components query Convex directly and handle checkout, portal,
syncing, and billing state out of the box.

### Wire the API

```svelte
<script lang="ts">
  import { setupConvex } from "convex-svelte";
  import {
    Subscription, Product, BillingPortal,
    type ConnectedBillingApi,
  } from "@mmailaender/creem/svelte";
  import { api } from "../convex/_generated/api.js";

  setupConvex(import.meta.env.VITE_CONVEX_URL);

  const billingApi: ConnectedBillingApi = {
    getBillingUiModel: api.billing.getBillingUiModel,
    generateCheckoutLink: api.billing.generateCheckoutLink,
    generateCustomerPortalUrl: api.billing.generateCustomerPortalUrl,
    changeCurrentSubscription: api.billing.changeCurrentSubscription,
    updateSubscriptionSeats: api.billing.updateSubscriptionSeats,
    cancelCurrentSubscription: api.billing.cancelCurrentSubscription,
    resumeCurrentSubscription: api.billing.resumeCurrentSubscription,
  };
</script>
```

### `<Subscription.Group>` — subscription pricing page

If `planCatalog` is configured in the Creem constructor, plans auto-render with
zero config:

```svelte
<Subscription.Group api={billingApi} />
```

Or override with explicit `<Subscription>` children for custom layouts or
multiple subscription widgets:

```svelte
<Subscription.Group api={billingApi}>
  <Subscription type="free" title="Free" />
  <Subscription
    planId="basic"
    type="single"
    productIds={{
      "every-month": "prod_basic_monthly",
      "every-year": "prod_basic_yearly",
    }}
  />
  <Subscription type="enterprise" contactUrl="https://example.com/sales" />
</Subscription.Group>
<BillingPortal api={billingApi} />
```

#### `<Subscription.Group>` props

| Prop             | Type                  | Description                                        |
| ---------------- | --------------------- | -------------------------------------------------- |
| `api`            | `ConnectedBillingApi` | **Required.** Backend function references.         |
| `className`      | `string`              | Wrapper CSS class.                                 |
| `successUrl`     | `string`              | Redirect after checkout. Defaults to current page. |
| `units`          | `number`              | Auto-derived seat count for seat-based plans.      |
| `showSeatPicker` | `boolean`             | Show a quantity picker on seat-based plan cards.   |
| `children`       | `Snippet`             | Slot for `<Subscription>` items or custom UI.      |

### `<Subscription>` — subscription plan (standalone or grouped)

The same component works both as an item inside `<Subscription.Group>` and as a
standalone single-plan card. When used inside a group, it registers plan data
with the parent. When used standalone, it fetches its own billing model and
renders a pricing card.

| Prop          | Type                                                 | Description                                                     |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `type`        | `"free" \| "single" \| "seat-based" \| "enterprise"` | **Required.** Plan type.                                        |
| `planId`      | `string`                                             | Unique plan identifier. Defaults to first product ID or `type`. |
| `title`       | `string`                                             | Plan title. Auto-resolves from product data if omitted.         |
| `description` | `string`                                             | Plan subtitle. Auto-resolves from product data if omitted.      |
| `contactUrl`  | `string`                                             | "Contact sales" link for enterprise plans.                      |
| `productIds`  | `Record<RecurringCycle, string>`                     | Creem product IDs keyed by billing cycle.                       |
| `api`         | `ConnectedBillingApi`                                | Required in standalone mode only.                               |
| `className`   | `string`                                             | Standalone mode only. Wrapper CSS class.                        |
| `successUrl`  | `string`                                             | Standalone mode only. Redirect after checkout.                  |

`Subscription.Item` is an alias for `Subscription` for discoverability.

Supported billing cycles: `every-month`, `every-three-months`,
`every-six-months`, `every-year`.

The billing toggle automatically derives from the cycles present in registered
plans. If all plans only have `every-month`, no toggle is shown.

#### Seat-based plans

Two workflows:

1. **User-selectable** — set `showSeatPicker` on `<Subscription.Group>` to show
   a quantity input per seat-based plan card.
2. **Auto-derived** — set `units={count}` on `<Subscription.Group>` to pass a
   fixed count (e.g. from org member count) to checkout.

### `<BillingPortal>` — billing portal button

A standalone widget for the Creem customer billing portal. Place it after a
subscription group or anywhere else:

```svelte
<Subscription.Group api={billingApi}>
  <Subscription type="free" title="Free" />
  <Subscription type="single" productIds={{ ... }} />
</Subscription.Group>
<BillingPortal api={billingApi} />

<!-- Or standalone, e.g. in a settings page -->
<BillingPortal api={billingApi}>Manage billing</BillingPortal>
```

| Prop        | Type                  | Description                                |
| ----------- | --------------------- | ------------------------------------------ |
| `api`       | `ConnectedBillingApi` | **Required.** Backend function references. |
| `className` | `string`              | Button CSS class.                          |
| `children`  | `Snippet`             | Custom button label. Default: "Manage billing". |

The component auto-hides when the user has no Creem customer record.

### `<Product>` — product card (standalone or grouped)

The same component works both as an item inside `<Product.Group>` and as a
standalone product card. When used inside a group, it registers product data
with the parent. When used standalone, it fetches its own billing model and
renders a full card with checkout.

```svelte
<!-- Standalone -->
<Product api={billingApi} type="one-time" productId="prod_xxx" />
<Product api={billingApi} type="recurring" productId="prod_yyy" title="Credit Top-Up" />
```

| Prop          | Type                        | Description                                          |
| ------------- | --------------------------- | ---------------------------------------------------- |
| `productId`   | `string`                    | **Required.** Creem product ID.                      |
| `type`        | `"one-time" \| "recurring"` | **Required.** One-time shows "Owned" after purchase. |
| `title`       | `string`                    | Card title. Auto-resolves from product data.         |
| `description` | `string`                    | Card subtitle. Auto-resolves from product data.      |
| `api`         | `ConnectedBillingApi`       | Required in standalone mode only.                    |
| `successUrl`  | `string`                    | Standalone mode only. Redirect after checkout.       |

`Product.Item` is an alias for `Product` for discoverability.

### `<Product.Group>` — mutually exclusive products with upgrades

```svelte
<Product.Group api={billingApi} transition={[
  { from: "prod_basic", to: "prod_premium", kind: "via_product", viaProductId: "prod_upgrade" },
]}>
  <Product type="one-time" productId="prod_basic" title="Basic" />
  <Product type="one-time" productId="prod_premium" title="Premium" />
</Product.Group>
```

The transition graph controls which upgrade/purchase paths are available when
the user already owns a product.

---

## 4. Presentational components (Svelte)

Lower-level building blocks for custom layouts. These do **not** call Convex
directly.

```svelte
import {
  BillingToggle, PricingCard, PricingSection,
  CheckoutButton, CustomerPortalButton,
  BillingGate, CheckoutSuccessSummary,
  TrialLimitBanner, ScheduledChangeBanner, PaymentWarningBanner,
  OneTimeCheckoutButton, OneTimePaymentStatusBadge,
} from "@mmailaender/creem/svelte";
```

All Svelte components use Svelte 5 runes and snippet rendering
(`{@render ...}`).

---

## 5. React components

```tsx
import {
  CheckoutLink,
  CheckoutButton,
  OneTimeCheckoutLink,
  OneTimeCheckoutButton,
  CustomerPortalLink,
  CustomerPortalButton,
  BillingToggle,
  PricingCard,
  PricingSection,
  BillingGate,
  TrialLimitBanner,
  ScheduledChangeBanner,
  PaymentWarningBanner,
  CheckoutSuccessSummary,
  OneTimePaymentStatusBadge,
  useCheckoutSuccessParams,
} from "@mmailaender/creem/react";
```

See the [React example](example) for a complete integration.

---

## 6. API surface

The `Creem` client provides:

- `getCurrentSubscription(ctx, { userId })`
- `listUserSubscriptions(ctx, { userId })` — active subscriptions
- `listAllUserSubscriptions(ctx, { userId })` — including ended
- `listUserOrders(ctx, { userId })` — paid one-time orders
- `listProducts(ctx)`
- `getProduct(ctx, { productId })`
- `getCustomerByUserId(ctx, userId)`
- `syncProducts(ctx)`
- `getBillingSnapshot(ctx, { userId, payment? })`
- `buildBillingUiModel(ctx, { userId })` — aggregates all billing data for
  widgets (subscriptions, orders, products, snapshot)
- `changeSubscription(ctx, { productId })`
- `updateSubscriptionSeats(ctx, { units })` — update seat count with proration
- `cancelSubscription(ctx, { revokeImmediately? })`
- `resumeSubscription(ctx)` — resume scheduled_cancel or paused
- `registerRoutes(http, { path?, events? })` — auto-handles checkout,
  subscription, product, and order webhooks

And action/query wrappers via `creem.api()`:

- `getConfiguredProducts`, `listAllProducts`, `listAllSubscriptions`
- `getCurrentBillingSnapshot`, `getBillingUiModel`
- `generateCheckoutLink`, `generateCustomerPortalUrl`
- `changeCurrentSubscription`, `updateSubscriptionSeats`
- `cancelCurrentSubscription`, `resumeCurrentSubscription`

---

## Advanced: server endpoint overrides

Only use these if you need a non-default API endpoint (e.g. test/staging).

```bash
npx convex env set CREEM_SERVER_IDX <index>
# or
npx convex env set CREEM_SERVER_URL <url>
```

If you don't need endpoint overrides, leave both unset.
