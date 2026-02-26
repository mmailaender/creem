<script lang="ts">
  import { setupConvex } from "convex-svelte";
  import {
    CheckoutSuccessSummary,
    BillingPortal,
    Product,
    Subscription,
    type ConnectedBillingApi,
    type Transition,
  } from "@mmailaender/convex-creem/svelte";
  import { api } from "../../convex/_generated/api.js";

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is required for the connected billing demo.",
    );
  }
  setupConvex(convexUrl);

  const connectedApi: ConnectedBillingApi = {
    getBillingUiModel: api.billing.getBillingUiModel,
    generateCheckoutLink: api.billing.generateCheckoutLink,
    generateCustomerPortalUrl: api.billing.generateCustomerPortalUrl,
    changeCurrentSubscription: api.billing.changeCurrentSubscription,
    updateSubscriptionSeats: api.billing.updateSubscriptionSeats,
    cancelCurrentSubscription: api.billing.cancelCurrentSubscription,
    resumeCurrentSubscription: api.billing.resumeCurrentSubscription,
  };

  const upgradeTransitions: Transition[] = [
    {
      from: "prod_4Di7Lkhf3TXy4UOKsUrGw0",
      to: "prod_56sJIyL7piLCVv270n4KBz",
      kind: "via_product",
      viaProductId: "prod_5LApsYRX8dHbx8QuLJgJ3j",
    },
  ];
</script>

<main class="mx-auto max-w-6xl px-4 py-10 space-y-14">
  <header class="space-y-2">
    <h1 class="text-3xl font-semibold">Connected Billing Widgets (Svelte)</h1>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      These widgets query Convex directly through the Creem wrapper API using
      <code>convex-svelte</code>, with backend-derived billing state in the UI
      model.
    </p>
  </header>

  <CheckoutSuccessSummary
    className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
  />

  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!--  SIMPLE SETUP — auto-renders plans from planCatalog, zero config  -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">
      0. Simple Setup (Auto-Render from planCatalog)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      No <code>&lt;Subscription&gt;</code> children needed — plans, titles, and
      descriptions are resolved automatically from the <code>planCatalog</code>
      config and the Creem product table.
    </p>
    <Subscription.Group api={connectedApi} className="space-y-4" />
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!--  ADVANCED / FLEXIBLE — explicit <Subscription> children            -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->

  <!-- ─── Section 1: Subscriptions with trial (all 4 billing cycles) ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">
      1. Subscription — With Trial (4 Cycles)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      All four billing cycles are available. The toggle derives from the
      registered plans automatically.
    </p>
    <Subscription.Group api={connectedApi} className="space-y-4">
      <Subscription
        type="free"
        title="Free"
        description={`✔️ Up to 3 users

✔️ Basic task management

✔️ Drag & drop builder

✔️ Task deadlines & reminders

✔️ Mobile access

✔️ Priority support

✔️ 1-1 calls
`}
      />
      <Subscription
        planId="basic"
        type="single"
        productIds={{
          "every-month": "prod_4if4apw1SzOXSUAfGL0Jp9",
          "every-three-months": "prod_5SxwV6WbbluzUQ2FmZ4trD",
          "every-six-months": "prod_7Lhs8en6kiBONIywQUlaQC",
          "every-year": "prod_KE9mMfH58482NIbKgK4nF",
        }}
      />
      <Subscription
        planId="premium"
        type="single"
        recommended
        productIds={{
          "every-month": "prod_7Cukw2hVIT5DvozmomK67A",
          "every-three-months": "prod_7V5gRIqWgui5wQflemUBOF",
          "every-six-months": "prod_4JN9cHsEto3dr0CQpgCxn4",
          "every-year": "prod_6ytx0cFhBvgXLp1jA6CQqH",
        }}
      />
      <Subscription
        type="enterprise"
        title="Enterprise"
        contactUrl="https://creem.io"
      />
    </Subscription.Group>
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ─── Section 2: Subscriptions without trial (monthly only) ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">
      2. Subscription — Without Trial (Monthly Only)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Only monthly products registered. The billing toggle should not appear.
    </p>
    <Subscription.Group api={connectedApi} className="space-y-4">
      <Subscription
        type="free"
        title="Free"
        description={`✔️ Up to 3 users

✔️ Basic task management

✔️ Drag & drop builder

✔️ Task deadlines & reminders

✔️ Mobile access

✔️ Priority support

✔️ 1-1 calls
`}
      />
      <Subscription
        type="single"
        productIds={{ "every-month": "prod_53CU7duHB58lGTUqKlRroI" }}
      />
      <Subscription
        type="single"
        productIds={{ "every-month": "prod_3ymOe55fDzKgmPoZnPEOBq" }}
      />
      <Subscription
        type="enterprise"
        title="Enterprise"
        contactUrl="https://creem.io"
      />
    </Subscription.Group>
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ─── Section 3: Seat-based subscriptions ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">
      3. Subscription — Seat-Based (User-Selectable)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Seat-based plans with a quantity picker. The user selects how many seats
      before checkout.
    </p>
    <Subscription.Group api={connectedApi} className="space-y-4" showSeatPicker>
      <Subscription
        type="seat-based"
        productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
      />
      <Subscription
        type="seat-based"
        productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
      />
    </Subscription.Group>
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ─── Section 3b: Seat-based with auto-derived units ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">
      3b. Subscription — Seat-Based (Auto-Derived)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Same seat-based products but with a fixed unit count (e.g. derived from
      organization member count). No picker shown — hardcoded to 5 seats.
    </p>
    <Subscription.Group api={connectedApi} className="space-y-4" units={5}>
      <Subscription
        type="seat-based"
        productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
      />
      <Subscription
        type="seat-based"
        productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
      />
    </Subscription.Group>
  </section>

  <!-- ─── Section 4: Standalone one-time product ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">4. Single One-Time Product</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      A standalone product purchased once. Shows "Owned" after purchase.
    </p>
    <Product
      api={connectedApi}
      type="one-time"
      productId="prod_6npEfkzgtr9hSqdWd7fqKG"
    />
  </section>

  <!-- ─── Section 5: Mutually exclusive product group with upgrade ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">5. Mutually Exclusive Product Group</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Transition graph decides available upgrade paths. Upgrading from Basic to
      Premium uses a dedicated delta product. Buy first the Basic Product and
      then upgrade to Premium.
    </p>

    <Product.Group api={connectedApi} transition={upgradeTransitions}>
      <Product type="one-time" productId="prod_4Di7Lkhf3TXy4UOKsUrGw0" />
      <Product type="one-time" productId="prod_56sJIyL7piLCVv270n4KBz" />
    </Product.Group>
  </section>

  <!-- ─── Section 6: Repeating (consumable) product ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">6. Repeating Product (Consumable)</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Can be purchased multiple times. No "Owned" badge — always shows the
      purchase button.
    </p>
    <Product
      api={connectedApi}
      type="recurring"
      productId="prod_73CnZ794MaJ1DUn8MU0O5f"
    />
  </section>
</main>
