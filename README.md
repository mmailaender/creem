# Convex Creem Component

Add subscriptions, one-time purchases, and billing to your Convex app with
[Creem](https://www.creem.io).

**Check out the [Svelte example](example-svelte) and [React example](example-react)
for complete integrations.**

## Table of Contents

- [Quick Start — Backend](#quick-start--backend)
  - [1. Install](#1-install)
  - [2. Register component](#2-register-component)
  - [3. Set environment variables](#3-set-environment-variables)
  - [4. Register webhooks](#4-register-webhooks)
  - [5. Configure billing](#5-configure-billing)
  - [6. Sync products](#6-sync-products)
- [Quick Start — Frontend (UI Widgets)](#quick-start--frontend-ui-widgets)
  - [7. Install Tailwind CSS](#7-install-tailwind-css)
  - [8. Import styles](#8-import-styles)
- [Entity Model](#entity-model)
- [Scenarios — Svelte](#scenarios--svelte)
  - [Wire the billing API](#wire-the-billing-api)
  - [1. Subscriptions](#1-subscriptions)
  - [2. Products](#2-products)
  - [3. Billing Portal](#3-billing-portal)
  - [4. Feature Gating](#4-feature-gating)
  - [5. Checkout Success](#5-checkout-success)
- [Scenarios — React](#scenarios--react)
- [Advanced](#advanced)
  - [Webhook event middleware](#webhook-event-middleware)
  - [Security & Access Control](#security--access-control)
  - [Custom billing resolver](#custom-billing-resolver)
  - [Custom billing UI model](#custom-billing-ui-model)
  - [Server endpoint overrides](#server-endpoint-overrides)
- [API Reference](#api-reference)
  - [Tier 1: `creem.api()` — entity-scoped](#tier-1-creemapi--entity-scoped)
  - [Tier 2: Class methods — explicit entityId](#tier-2-class-methods--explicit-entityid)
  - [Utility methods](#utility-methods)
  - [SDK pass-through](#sdk-pass-through)
- [Component Reference — Svelte](#component-reference--svelte)
  - [Widgets](#widgets)
  - [Presentational components](#presentational-components)
- [Component Reference — React](#component-reference--react)
- [Troubleshooting](#troubleshooting)

---

## Quick Start — Backend

Complete these steps to use the billing API from your Convex functions.
No frontend framework required.

### 1. Install

```bash
npm install @mmailaender/convex-creem
```

### 2. Register component

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import creem from "@mmailaender/convex-creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
```

### 3. Set environment variables

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_signing_secret>
```

### 4. Register webhooks

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { creem } from "./billing";

const http = httpRouter();

creem.registerRoutes(http);

export default http;
```

Use your **Convex site URL** + `/creem/events` as the webhook endpoint in your
Creem dashboard. The component automatically handles `checkout.completed`,
`subscription.*`, and `product.*` events.

> For custom event handlers (e.g. sending emails on checkout), see
> [Webhook event middleware](#webhook-event-middleware).

### 5. Configure billing

```ts
// convex/billing.ts
import { Creem } from "@mmailaender/convex-creem";
import { api, components } from "./_generated/api";

export const creem = new Creem(components.creem, {
  getUserInfo: async (ctx) => {
    const user = await ctx.runQuery(api.users.currentUser);
    return {
      userId: user._id,
      email: user.email,
      // For org billing, add: billingEntityId: org._id
    };
  },
});

// Export entity-scoped API — safe to call from the frontend
export const {
  listAllProducts,
  getCurrentBillingSnapshot,
  getBillingUiModel,
  generateCheckoutLink,
  generateCustomerPortalUrl,
  changeCurrentSubscription,
  updateSubscriptionSeats,
  cancelCurrentSubscription,
  resumeCurrentSubscription,
  pauseCurrentSubscription,
  getProduct,
  getCustomer,
  listSubscriptions,
  listOrders,
} = creem.api();

// Sync products from Creem (CLI / dashboard only)
import { internalAction } from "./_generated/server";
export const syncBillingProducts = internalAction({
  args: {},
  handler: async (ctx) => { await creem.syncProducts(ctx); },
});
```

### 6. Sync products

After configuring webhooks, pull your Creem products into the Convex database:

```bash
npx convex run billing:syncBillingProducts
```

> This is an `internalAction` — it can only be triggered from the CLI or the
> Convex dashboard.

**You're done with the backend.** You can now call `api.billing.*` from your
frontend or other Convex functions. If you only need the API (no UI widgets),
skip ahead to the [API Reference](#api-reference).

---

## Quick Start — Frontend (UI Widgets)

The component ships pre-built Svelte and React widgets that handle checkout,
plan switching, cancellation, seat management, and billing state — all connected
to Convex. Complete these two extra steps to use them.

### 7. Install Tailwind CSS

The widgets use [Tailwind CSS v4](https://tailwindcss.com/docs/installation).
If your project doesn't have Tailwind yet, install it following the
[official guide](https://tailwindcss.com/docs/installation).

### 8. Import styles

Add the component's design system import to your CSS entry point, **after**
the Tailwind import:

```css
@import "tailwindcss";
@import "@mmailaender/convex-creem/styles";
```

This registers the component's design tokens, base styles, and `@source`
directives so Tailwind scans the library's component files automatically.

**You're ready to use the UI widgets.** Continue with the scenarios below.

---

## Entity Model

By default, billing is scoped to the **authenticated user** — `userId` from
`getUserInfo` is used as the billing entity. All `creem.api()` functions, checkout
metadata, and webhook resolution automatically use this entity.

For **organization or team billing**, return `billingEntityId` from `getUserInfo`:

```ts
getUserInfo: async (ctx) => {
  const user = await ctx.runQuery(api.users.currentUser);
  const org = await ctx.runQuery(api.orgs.getActiveOrg);
  return {
    userId: user._id,
    email: user.email,
    billingEntityId: org?._id, // omit for personal billing
  };
},
```

When `billingEntityId` is set, all billing operations scope to that entity.
Webhooks resolve `convexBillingEntityId` from checkout metadata (falls back to
`convexUserId`). No other code changes needed.

For access control details, see [Security & Access Control](#security--access-control).

---

## Scenarios — Svelte

All scenarios below use the Svelte widgets. They query Convex directly and
handle checkout, plan switching, and billing state out of the box.

### Wire the billing API

Every widget needs a `ConnectedBillingApi` object. Create it once in your
layout or page component:

```svelte
<script lang="ts">
  import { setupConvex } from "convex-svelte";
  // Import only the widgets you need — e.g. just Subscription for subscription-only apps.
  import {
    Subscription, Product, BillingPortal,
    type ConnectedBillingApi,
  } from "@mmailaender/convex-creem/svelte";
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

### 1. Subscriptions

#### 1.1 Standard subscription plans

A typical pricing page with Free / Basic / Premium / Enterprise tiers.
The billing toggle auto-derives from the cycles present in registered plans.

```svelte
<Subscription.Root api={billingApi}>
  <Subscription.Item type="free" title="Free" description="Up to 3 users" />
  <Subscription.Item
    planId="basic"
    type="single"
    productIds={{
      "every-month": "prod_basic_monthly",
      "every-year": "prod_basic_yearly",
    }}
  />
  <Subscription.Item
    planId="premium"
    type="single"
    recommended
    productIds={{
      "every-month": "prod_premium_monthly",
      "every-year": "prod_premium_yearly",
    }}
  />
  <Subscription.Item
    type="enterprise"
    title="Enterprise"
    contactUrl="https://example.com/sales"
  />
</Subscription.Root>
<BillingPortal api={billingApi} />
```

**What you get:**
- Pricing cards with auto-resolved titles, descriptions (rendered as Markdown), and prices from Creem product data
- Billing cycle toggle (monthly/yearly) — hidden when all plans share a single cycle
- "Current plan" badge on the active subscription
- Plan switching
- Trial countdown badge
- Cancel / resume subscription (with confirmation dialog)
- Scheduled cancellation banner with "Undo" button

#### 1.2 Seat-based subscriptions

Two workflows for seat-based pricing:

**User-selectable seats** — the customer picks a quantity before checkout:

```svelte
<Subscription.Root api={billingApi} showSeatPicker>
  <Subscription.Item
    type="seat-based"
    productIds={{ "every-month": "prod_team_monthly" }}
  />
  <Subscription.Item
    type="seat-based"
    productIds={{ "every-month": "prod_business_monthly" }}
  />
</Subscription.Root>
```

**Auto-derived seats** — pass a fixed count (e.g. org member count) to checkout:

```svelte
<script lang="ts">
  // Derive seat count from your data
  const orgMemberCount = $derived(members.length);
</script>

<Subscription.Root api={billingApi} units={orgMemberCount}>
  <Subscription.Item
    type="seat-based"
    productIds={{ "every-month": "prod_team_monthly" }}
  />
</Subscription.Root>
```

When `updateSubscriptionSeats` is provided in the API, active seat-based plans
show a "Change seats" control.

> **Tip:** For auto-derived seats, keep the subscription in sync with your data.
> When your member count changes, call `updateSubscriptionSeats` so the billing reflects the current
> seat count.

### 2. Products

#### 2.1 Single one-time product

A standalone product purchased once. Shows "Owned" after purchase:

```svelte
<Product.Root api={billingApi}>
  <Product.Item type="one-time" productId="prod_license" />
</Product.Root>
```

#### 2.2 Repeating product (consumable)

Can be purchased multiple times — no "Owned" badge:

```svelte
<Product.Root api={billingApi}>
  <Product.Item type="recurring" productId="prod_credits" title="100 Credits" />
</Product.Root>
```

#### 2.3 Mutually exclusive product group

Use the `transition` prop to define upgrade paths between products. When the
user owns a lower-tier product, only valid upgrade paths are shown:

```svelte
<Product.Root
  api={billingApi}
  transition={[
    {
      from: "prod_basic_license",
      to: "prod_premium_license",
      kind: "via_product",
      viaProductId: "prod_basic_to_premium_upgrade",
    },
  ]}
>
  <Product.Item type="one-time" productId="prod_basic_license" />
  <Product.Item type="one-time" productId="prod_premium_license" />
</Product.Root>
```

**Transition kinds:**
- **`via_product`** — checkout uses a dedicated upgrade product (delta pricing)
- **`direct`** — checkout uses the target product directly

### 3. Billing Portal

`<BillingPortal>` opens the Creem customer billing portal. It auto-hides
when the billing entity has no Creem customer record.

Pass `permissions` to control who can access the portal (e.g. only admins):

```svelte
<BillingPortal api={billingApi} permissions={{ canAccessPortal: isAdmin }} />
```

```svelte
<!-- After a subscription group -->
<BillingPortal api={billingApi} />

<!-- Standalone with custom label -->
<BillingPortal api={billingApi}>Manage billing & invoices</BillingPortal>
```

### 4. Feature Gating

Use `BillingGate` to conditionally render UI based on available billing actions:

```svelte
<script lang="ts">
  import { BillingGate } from "@mmailaender/convex-creem/svelte";
</script>

<BillingGate snapshot={billingSnapshot} requiredActions="portal">
  {#snippet children()}
    <p>You have portal access.</p>
  {/snippet}
  {#snippet fallback()}
    <p>Upgrade to access the billing portal.</p>
  {/snippet}
</BillingGate>
```

Available actions: `checkout`, `portal`, `cancel`, `reactivate`,
`switch_interval`, `update_seats`, `contact_sales`.

### 5. Checkout Success

Show a confirmation banner when the user returns from checkout. The component
parses Creem's query parameters automatically:

```svelte
<script lang="ts">
  import { CheckoutSuccessSummary } from "@mmailaender/convex-creem/svelte";
</script>

<CheckoutSuccessSummary />
```

---

## Scenarios — React

The React export provides presentational components for building custom billing
UIs. Full widgets (equivalent to the Svelte `Subscription.Root` /
`Product.Root` pattern) are coming soon.

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
} from "@mmailaender/convex-creem/react";
```

See the [React example](example-react) for a complete integration with
`convex/react` hooks.

---

## Advanced

### Webhook event middleware

`registerRoutes` accepts an optional `events` object to run app-specific logic
alongside the component's automatic handling:

```ts
creem.registerRoutes(http, {
  path: "/creem/events", // default
  events: {
    "checkout.completed": async (ctx, event) => {
      // ctx is a Convex mutation context
      // event has { type, data } from Creem
      // Example: send confirmation email, grant entitlements, log analytics
    },
    "subscription.updated": async (ctx, event) => {
      const data = event.data as { customerCancellationReason?: string };
      if (data?.customerCancellationReason) {
        console.log("Cancellation reason:", data.customerCancellationReason);
      }
    },
  },
});
```

Your handlers run **after** the component's built-in processing (customer/subscription/order upserts).
The `ctx` is a Convex mutation context — you can read/write to your own tables.

**Supported events:** `checkout.completed`, `subscription.active`,
`subscription.updated`, `subscription.canceled`, `subscription.paused`,
`subscription.resumed`, `product.created`, `product.updated`.

### Security & Access Control

The component's API is split into two security tiers:

- **Tier 1 (`creem.api()`)** — auto-resolves the billing entity from
  `getUserInfo`. Safe to export directly. Always operates on the authenticated
  entity's data (user or organization — see [Entity Model](#entity-model)).
- **Tier 2 (class methods)** — takes an explicit `entityId`. Not exported.
  Wrap in your own Convex functions with access control checks.

**Access control is the app's responsibility.** The component provides
`BillingPermissions` to control UI actions:

```ts
type BillingPermissions = {
  canCheckout?: boolean;
  canChangeSubscription?: boolean;
  canCancelSubscription?: boolean;
  canResumeSubscription?: boolean;
  canUpdateSeats?: boolean;
  canAccessPortal?: boolean;
};
```

Pass `permissions` to any entry-point widget:

```svelte
<Subscription.Root
  api={billingApi}
  permissions={{ canCheckout: true, canCancelSubscription: false }}
/>
<Product.Root
  api={billingApi}
  permissions={{ canCheckout: false }}
>
  ...
</Product.Root>
```

When a permission is `false`, the button renders as disabled (greyed out).
When omitted or `undefined`, all actions default to enabled.

**Example: Convex better-auth integration**

```ts
// convex/billing.ts
export const creem = new Creem(components.creem, {
  getUserInfo: async (ctx) => {
    const session = await ctx.runQuery(api.auth.getSession);
    if (!session) throw new Error("Not authenticated");
    const org = await ctx.runQuery(api.orgs.getActiveOrg);
    return {
      userId: session.userId,
      email: session.user.email,
      billingEntityId: org?._id,
    };
  },
});
```

```svelte
<!-- Derive permissions from user role -->
<script lang="ts">
  const isAdmin = $derived(currentUser?.role === "admin" || currentUser?.role === "owner");
  const permissions = $derived({
    canCheckout: isAdmin,
    canChangeSubscription: isAdmin,
    canCancelSubscription: isAdmin,
    canResumeSubscription: isAdmin,
    canUpdateSeats: isAdmin,
  });
</script>

<Subscription.Root api={billingApi} {permissions}>
  ...
</Subscription.Root>
```

### Custom billing resolver

Override how billing state is resolved from subscription data:

```ts
export const creem = new Creem(components.creem, {
  getUserInfo: async (ctx) => { /* ... */ },
  resolvePlan: async (ctx, input) => {
    // input: { currentSubscription, allSubscriptions, payment, userContext }
    // Return a BillingSnapshot
    return {
      resolvedAt: new Date().toISOString(),
      activePlanId: input.currentSubscription?.productId ?? null,
      activeCategory: input.currentSubscription ? "paid" : "free",
      billingType: input.currentSubscription ? "recurring" : "custom",
      availableBillingCycles: ["every-month", "every-year"],
      payment: input.payment ?? null,
      availableActions: ["checkout", "portal"],
    };
  },
  getUserBillingContext: async (ctx) => {
    // Return arbitrary data available to resolvePlan
    return { teamSize: 5, featureFlags: ["beta"] };
  },
});
```

### Custom billing UI model

`getBillingUiModel` (from `creem.api()`) returns everything the connected
widgets need. If you need app-specific fields, write your own query:

```ts
import { query } from "./_generated/server";

export const getCustomBillingModel = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return { user: null, billingSnapshot: null };

    const billingData = await creem.buildBillingUiModel(ctx, {
      entityId: user._id,
    });
    return {
      user,
      ...billingData,
      teamSize: user.teamSize,
      featureFlags: user.featureFlags,
    };
  },
});
```

### Server endpoint overrides

Only needed for non-default API endpoints (e.g. test/staging):

```bash
npx convex env set CREEM_SERVER_IDX <index>
# or
npx convex env set CREEM_SERVER_URL <url>
```

Leave both unset to use the default Creem production endpoint.

---

## API Reference

### Tier 1: `creem.api()` — entity-scoped

These auto-resolve the billing entity from `getUserInfo` and are safe to export
directly from `convex/billing.ts`.

| Export | Type | Description |
|---|---|---|
| `listAllProducts` | query | All active products synced from Creem |
| `getCurrentBillingSnapshot` | query | Resolved billing state (plan, status, actions) |
| `getBillingUiModel` | query | Full billing state for widgets |
| `generateCheckoutLink` | action | Creates a Creem checkout URL. Resolves `successUrl` via: explicit arg → product `defaultSuccessUrl` → `fallbackSuccessUrl` (current page). |
| `generateCustomerPortalUrl` | action | Customer billing portal URL |
| `changeCurrentSubscription` | action | Switch to a different subscription product. Proration defaults to your Creem dashboard setting. |
| `updateSubscriptionSeats` | action | Update seat count with proration |
| `cancelCurrentSubscription` | action | Cancel subscription (immediate or scheduled) |
| `resumeCurrentSubscription` | action | Resume a paused or scheduled-cancel subscription |
| `pauseCurrentSubscription` | action | Pause an active subscription |
| `getProduct` | query | Single product by ID |
| `getCustomer` | query | Customer record for current entity |
| `listSubscriptions` | query | Active subscriptions for current entity |
| `listOrders` | query | Orders for current entity |

### Tier 2: Class methods — explicit entityId

These take an explicit `entityId` and are **not** in `creem.api()`. Wrap them in
your own Convex functions with access control checks.

| Method | Description |
|---|---|
| `creem.getCurrentSubscription(ctx, { entityId })` | Current active subscription with product |
| `creem.listUserSubscriptions(ctx, { entityId })` | Active subscriptions (excludes ended) |
| `creem.listAllUserSubscriptions(ctx, { entityId })` | All subscriptions including ended |
| `creem.listUserOrders(ctx, { entityId })` | Paid one-time orders |
| `creem.getCustomerByEntityId(ctx, entityId)` | Customer record by entity |
| `creem.getBillingSnapshot(ctx, { entityId, payment? })` | Resolved billing state |
| `creem.buildBillingUiModel(ctx, { entityId })` | Full billing UI model |
| `creem.changeSubscription(ctx, { entityId, productId })` | Switch subscription |
| `creem.updateSubscriptionSeats(ctx, { entityId, units })` | Update seats |
| `creem.cancelSubscription(ctx, { entityId, revokeImmediately? })` | Cancel subscription |
| `creem.pauseSubscription(ctx, { entityId })` | Pause subscription |
| `creem.resumeSubscription(ctx, { entityId })` | Resume subscription |
| `creem.createCheckoutSession(ctx, { entityId, userId, email, productId, successUrl, units?, metadata? })` | Create checkout |
| `creem.createCustomerPortalSession(ctx, { entityId })` | Customer portal session |

### Utility methods

| Method | Description |
|---|---|
| `creem.listProducts(ctx)` | All synced products |
| `creem.getProduct(ctx, { productId })` | Single product by ID |
| `creem.syncProducts(ctx)` | Pull products from Creem API |
| `creem.registerRoutes(http, { path?, events? })` | Register webhook HTTP routes |

### SDK pass-through

For direct Creem API access (products, licenses, discounts, transactions), use
`creem.sdk.*` in your own Convex action wrappers:

```ts
// Example: create a discount
export const createDiscount = action({
  args: { code: v.string(), percentage: v.number() },
  handler: async (ctx, args) => {
    return await creem.sdk.discounts.create({
      name: args.code,
      code: args.code,
      type: "percentage",
      percentage: args.percentage,
      duration: "forever",
      appliesTo: [],
    });
  },
});
```

---

## Component Reference — Svelte

All Svelte components use Svelte 5 runes and snippet rendering (`{@render ...}`).

Import from `@mmailaender/convex-creem/svelte`.

### Widgets

These query Convex directly and manage billing state end-to-end.

#### `<Subscription.Root>`

Container for subscription plan cards. Handles billing cycle toggle, checkout,
plan switching, cancellation, and seat management.

| Prop | Type | Default | Description |
|---|---|---|---|
| `api` | `ConnectedBillingApi` | — | **Required.** Backend function references |
| `permissions` | `BillingPermissions` | all enabled | Disable actions based on user role |
| `class` | `string` | `""` | Wrapper CSS class |
| `successUrl` | `string` | product's `defaultSuccessUrl` → current page | Override redirect after checkout. When omitted, uses the product's `defaultSuccessUrl` from Creem; if that is also unset, falls back to the current page. |
| `units` | `number` | — | Auto-derived seat count for seat-based plans |
| `showSeatPicker` | `boolean` | `false` | Show quantity picker on seat-based cards |
| `children` | `Snippet` | — | `<Subscription.Item>` children |

#### `<Subscription.Item>`

Registers a plan inside `<Subscription.Root>`. Renders nothing on its own — the
root component renders the pricing cards.

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `"free" \| "single" \| "seat-based" \| "enterprise"` | — | **Required.** Plan type |
| `planId` | `string` | first product ID or `type` | Unique plan identifier |
| `title` | `string` | from Creem product data | Plan display title |
| `description` | `string` | from Creem product data | Plan subtitle (rendered as Markdown) |
| `contactUrl` | `string` | — | "Contact sales" link. **Required when `type="enterprise"`**. |
| `recommended` | `boolean` | `false` | Highlight as recommended plan |
| `productIds` | `Partial<Record<RecurringCycle, string>>` | — | Creem product IDs keyed by billing cycle. **Required when `type="single"` or `type="seat-based"`**. |

**Supported billing cycles:** `every-month`, `every-three-months`,
`every-six-months`, `every-year`.

`Subscription` and `Subscription.Item` are aliases — use whichever reads
better in your markup.

#### `<Product.Root>`

Container for one-time or repeating product cards. Handles ownership tracking,
upgrade transitions, and checkout.

| Prop | Type | Default | Description |
|---|---|---|---|
| `api` | `ConnectedBillingApi` | — | **Required.** Backend function references |
| `permissions` | `BillingPermissions` | all enabled | Disable actions based on user role |
| `transition` | `Transition[]` | `[]` | Upgrade path rules between products |
| `class` | `string` | `""` | Wrapper CSS class |
| `successUrl` | `string` | product's `defaultSuccessUrl` → current page | Override redirect after checkout. When omitted, uses the product's `defaultSuccessUrl` from Creem; if that is also unset, falls back to the current page. |
| `children` | `Snippet` | — | `<Product.Item>` children |

**Transition types:**

```ts
type Transition =
  | { from: string; to: string; kind: "direct" }
  | { from: string; to: string; kind: "via_product"; viaProductId: string };
```

#### `<Product.Item>`

Registers a product inside `<Product.Root>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `productId` | `string` | — | **Required.** Creem product ID |
| `type` | `"one-time" \| "recurring"` | — | **Required.** One-time shows "Owned" badge after purchase |
| `title` | `string` | from Creem product data | Card display title |
| `description` | `string` | from Creem product data | Card subtitle (rendered as Markdown) |

`Product` and `Product.Item` are aliases.

#### `<BillingPortal>`

Button that opens the Creem customer billing portal. Auto-hides when the
billing entity has no Creem customer record, or when `canAccessPortal` is `false`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `api` | `ConnectedBillingApi` | — | **Required.** Backend function references |
| `permissions` | `BillingPermissions` | all enabled | Control portal access (e.g. `{ canAccessPortal: false }`) |
| `class` | `string` | `""` | Button CSS class |
| `children` | `Snippet` | `"Manage billing"` | Custom button label |

### Presentational components

Lower-level building blocks for custom layouts. These do **not** call Convex
directly — pass data and callbacks as props.

#### `<PricingSection>`

Renders a grid of pricing cards with an optional billing cycle toggle.

| Prop | Type | Description |
|---|---|---|
| `plans` | `UIPlanEntry[]` | Plan definitions |
| `snapshot` | `BillingSnapshot \| null` | Current billing state |
| `selectedCycle` | `RecurringCycle` | Active billing cycle |
| `products` | `ConnectedProduct[]` | Product data for price resolution |
| `subscriptionProductId` | `string \| null` | Currently subscribed product |
| `subscriptionStatus` | `string \| null` | Subscription status |
| `units` | `number` | Seat count |
| `showSeatPicker` | `boolean` | Show quantity picker |
| `subscribedSeats` | `number \| null` | Current seat count |
| `isGroupSubscribed` | `boolean` | Whether group has active subscription |
| `disableCheckout` | `boolean` | Disable checkout buttons |
| `disableSwitch` | `boolean` | Disable plan switch buttons |
| `disableSeats` | `boolean` | Disable seat controls |
| `onCycleChange` | `(cycle) => void` | Billing cycle change handler |
| `onCheckout` | `(payload) => void` | Checkout handler |
| `onSwitchPlan` | `(payload) => void` | Plan switch handler |
| `onUpdateSeats` | `(payload) => void` | Seat update handler |

#### `<PricingCard>`

A single plan card with price, description, and action button.
Same props as `<PricingSection>` for a single plan (see source for full list).

#### `<BillingToggle>`

Billing cycle segment control (e.g. Monthly / Yearly).

| Prop | Type | Description |
|---|---|---|
| `cycles` | `RecurringCycle[]` | Available cycles |
| `value` | `RecurringCycle` | Selected cycle |
| `onValueChange` | `(cycle) => void` | Change handler |
| `className` | `string` | CSS class |

#### `<CheckoutButton>`

Styled checkout button. Supports both `onCheckout` callback and `href` link modes.

| Prop | Type | Description |
|---|---|---|
| `productId` | `string` | Product ID |
| `href` | `string` | Link mode: direct URL |
| `disabled` | `boolean` | Disable button |
| `className` | `string` | CSS class |
| `onCheckout` | `(payload) => void` | Callback mode: `{ productId }` |
| `children` | `Snippet` | Button label (default: "Checkout") |

#### `<OneTimeCheckoutButton>`

Same as `<CheckoutButton>` with default label "Buy now".

#### `<CustomerPortalButton>`

Styled button for opening the customer billing portal.

| Prop | Type | Description |
|---|---|---|
| `href` | `string` | Link mode: direct URL |
| `disabled` | `boolean` | Disable button |
| `className` | `string` | CSS class |
| `onOpenPortal` | `() => void` | Callback mode |
| `children` | `Snippet` | Button label (default: "Manage billing") |

#### `<BillingGate>`

Conditionally renders children based on available billing actions.

| Prop | Type | Description |
|---|---|---|
| `snapshot` | `BillingSnapshot \| null` | Current billing state |
| `requiredActions` | `AvailableAction \| AvailableAction[]` | Actions that must be available |
| `children` | `Snippet` | Rendered when all actions are available |
| `fallback` | `Snippet` | Rendered otherwise |

#### `<CheckoutSuccessSummary>`

Displays a success banner after checkout. Parses Creem query params automatically.

| Prop | Type | Description |
|---|---|---|
| `params` | `CheckoutSuccessParams` | Manual params (overrides URL parsing) |
| `search` | `string` | Query string to parse (defaults to `window.location.search`) |
| `className` | `string` | CSS class |

#### `<TrialLimitBanner>`

Shows a trial expiration notice.

| Prop | Type | Description |
|---|---|---|
| `snapshot` | `BillingSnapshot \| null` | Current billing state |
| `trialEndsAt` | `string \| null` | Override trial end date |
| `className` | `string` | CSS class |

#### `<ScheduledChangeBanner>`

Shows a cancellation-scheduled notice with optional "Undo" button.

| Prop | Type | Description |
|---|---|---|
| `snapshot` | `BillingSnapshot \| null` | Current billing state |
| `isLoading` | `boolean` | Loading state for resume button |
| `onResume` | `() => void` | Resume handler (shows "Undo cancellation" button) |
| `className` | `string` | CSS class |

#### `<PaymentWarningBanner>`

Shows a warning for pending, refunded, or partially refunded payments.

| Prop | Type | Description |
|---|---|---|
| `snapshot` | `BillingSnapshot \| null` | Current billing state |
| `payment` | `PaymentSnapshot \| null` | Override payment data |
| `className` | `string` | CSS class |

#### `<OneTimePaymentStatusBadge>`

Inline status badge for one-time payments.

| Prop | Type | Description |
|---|---|---|
| `status` | `"pending" \| "paid" \| "refunded" \| "partially_refunded"` | Payment status |
| `className` | `string` | CSS class |

#### `<CancelConfirmDialog>`

Modal confirmation dialog for subscription cancellation. Uses Ark UI Dialog.

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Dialog open state |
| `isLoading` | `boolean` | Loading state |
| `onOpenChange` | `(open) => void` | Open state change handler |
| `onConfirm` | `() => void` | Confirm cancellation handler |

---

## Component Reference — React

React components are presentational building blocks. Import from
`@mmailaender/convex-creem/react`.

| Component | Description |
|---|---|
| `CheckoutLink` | Anchor-based checkout link |
| `CheckoutButton` | Button-based checkout with loading state |
| `OneTimeCheckoutLink` | One-time purchase link |
| `OneTimeCheckoutButton` | One-time purchase button |
| `CustomerPortalLink` | Anchor-based portal link |
| `CustomerPortalButton` | Button-based portal link with loading state |
| `BillingToggle` | Billing cycle segment control |
| `PricingCard` | Single plan pricing card |
| `PricingSection` | Grid of pricing cards with toggle |
| `BillingGate` | Conditional render based on billing actions |
| `TrialLimitBanner` | Trial expiration notice |
| `ScheduledChangeBanner` | Cancellation-scheduled notice |
| `PaymentWarningBanner` | Payment warning banner |
| `CheckoutSuccessSummary` | Post-checkout success banner |
| `OneTimePaymentStatusBadge` | Payment status badge |
| `useCheckoutSuccessParams` | Hook: parse checkout success query params |

See the [React example](example-react) for usage with `convex/react` hooks.

---

## Troubleshooting

**Webhooks not receiving events**
Verify your Creem dashboard webhook URL matches `<CONVEX_SITE_URL>/creem/events`.
Check that `CREEM_WEBHOOK_SECRET` matches the signing secret in Creem. Check the
Convex dashboard logs for verification errors.

**Products not syncing**
Run `npx convex run billing:syncBillingProducts` after setting up webhooks.
Ensure `CREEM_API_KEY` is set and the key has read access to products.

**Widgets rendering unstyled**
Ensure both Tailwind CSS v4 and `@import "@mmailaender/convex-creem/styles"` are
in your CSS entry point. The styles import must come after the Tailwind import.

**Checkout URL missing from response**
The Creem API returned no checkout URL. Verify the product ID exists and is
active in your Creem dashboard. Check the Convex dashboard logs for the full
error.

**Entity/org billing not scoping correctly**
Ensure `billingEntityId` is returned from `getUserInfo`. If omitted, `userId` is
used as the billing entity. Verify that checkout metadata includes
`convexBillingEntityId` by checking webhook logs.

**"Customer not found" when opening billing portal**
The customer record is created on first checkout. If the user hasn't completed
a checkout yet, there's no customer to link to the portal.
