<script lang="ts">
  import { setupConvex, useConvexClient } from "convex-svelte";
  import {
    CheckoutSuccessSummary,
    Product,
    Subscription,
    type ConnectedBillingApi,
    type Transition,
  } from "@mmailaender/creem/svelte";
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
    syncProducts: api.billing.syncBillingProducts,
    createDemoUser: api.example.createDemoUser,
    grantDemoEntitlement: api.billing.grantDemoEntitlement,
  };

  const upgradeTransitions: Transition[] = [
    {
      from: "prod_4Di7Lkhf3TXy4UOKsUrGw0",
      to: "prod_56sJIyL7piLCVv270n4KBz",
      kind: "via_product",
      viaProductId: "prod_5LApsYRX8dHbx8QuLJgJ3j",
    },
  ];

  const convex = useConvexClient();
  let grantError = $state<string | null>(null);

  const grantOwnership = async (productId: string) => {
    grantError = null;
    try {
      await convex.mutation(api.billing.grantDemoEntitlement, {
        productId,
        mode: "lifetime",
        source: "svelte-demo-widget",
      });
    } catch (error) {
      grantError =
        error instanceof Error ? error.message : "Could not grant ownership";
    }
  };
</script>

<main class="mx-auto max-w-6xl px-4 py-10 space-y-14">
  <header class="space-y-2">
    <h1 class="text-3xl font-semibold">Connected Billing Widgets (Svelte)</h1>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      These widgets query Convex directly through the Creem wrapper API using
      <code>convex-svelte</code>, with backend policy and entitlements in the UI
      model.
    </p>
  </header>

  <CheckoutSuccessSummary
    className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
  />

  <!-- ─── Section 1: Subscriptions with trial (all 4 billing cycles) ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">1. Subscription — With Trial (4 Cycles)</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      All four billing cycles are available. The toggle derives from the
      registered plans automatically.
    </p>
    <Subscription api={connectedApi} className="space-y-4">
      <Subscription.Plan type="free" displayName="Free" description="Start here with limited access" />
      <Subscription.Plan
        planId="basic"
        type="single"
        productIds={{
          "every-month": "prod_4if4apw1SzOXSUAfGL0Jp9",
          "every-three-months": "prod_5SxwV6WbbluzUQ2FmZ4trD",
          "every-six-months": "prod_7Lhs8en6kiBONIywQUlaQC",
          "every-year": "prod_KE9mMfH58482NIbKgK4nF",
        }}
      />
      <Subscription.Plan
        planId="premium"
        type="single"
        displayName="Premium"
        description="Advanced subscription plan."
        recommended
        productIds={{
          "every-month": "prod_7Cukw2hVIT5DvozmomK67A",
          "every-three-months": "prod_7V5gRIqWgui5wQflemUBOF",
          "every-six-months": "prod_4JN9cHsEto3dr0CQpgCxn4",
          "every-year": "prod_6ytx0cFhBvgXLp1jA6CQqH",
        }}
      />
      <Subscription.Plan type="enterprise" displayName="Enterprise" contactUrl="https://creem.io" />
    </Subscription>
  </section>

  <!-- ─── Section 2: Subscriptions without trial (monthly only) ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">2. Subscription — Without Trial (Monthly Only)</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Only monthly products registered. The billing toggle should not appear.
    </p>
    <Subscription api={connectedApi} className="space-y-4">
      <Subscription.Plan type="free" displayName="Free" description="No-cost tier" />
      <Subscription.Plan
        type="single"
        displayName="Basic"
        description="Monthly subscription, no trial"
        productIds={{ "every-month": "prod_53CU7duHB58lGTUqKlRroI" }}
      />
      <Subscription.Plan
        type="single"
        displayName="Premium"
        description="Monthly subscription, no trial"
        productIds={{ "every-month": "prod_3ymOe55fDzKgmPoZnPEOBq" }}
      />
      <Subscription.Plan type="enterprise" displayName="Enterprise" contactUrl="https://creem.io" />
    </Subscription>
  </section>

  <!-- ─── Section 3: Seat-based subscriptions ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">3. Subscription — Seat-Based (User-Selectable)</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Seat-based plans with a quantity picker. The user selects how many seats
      before checkout.
    </p>
    <Subscription api={connectedApi} className="space-y-4" showSeatPicker>
      <Subscription.Plan
        type="seat-based"
        displayName="Basic (per seat)"
        description="Per-seat monthly subscription"
        productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
      />
      <Subscription.Plan
        type="seat-based"
        displayName="Premium (per seat)"
        description="Per-seat monthly subscription"
        productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
      />
    </Subscription>
  </section>

  <!-- ─── Section 3b: Seat-based with auto-derived units ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">3b. Subscription — Seat-Based (Auto-Derived)</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Same seat-based products but with a fixed unit count (e.g. derived from
      organization member count). No picker shown — hardcoded to 5 seats.
    </p>
    <Subscription api={connectedApi} className="space-y-4" units={5}>
      <Subscription.Plan
        type="seat-based"
        displayName="Basic"
        description="Per-seat monthly subscription"
        productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
      />
      <Subscription.Plan
        type="seat-based"
        displayName="Premium"
        description="Per-seat monthly subscription"
        productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
      />
    </Subscription>
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
      title="Lifetime License"
      description="Buy once and own it forever."
    />
  </section>

  <!-- ─── Section 5: Mutually exclusive product group with upgrade ─── -->
  <section class="space-y-3">
    <h2 class="text-xl font-semibold">5. Mutually Exclusive Product Group</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Transition graph decides available upgrade paths. Upgrading from Basic to
      Premium uses a dedicated delta product.
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-md border px-3 py-2 text-sm hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onclick={() => grantOwnership("prod_4Di7Lkhf3TXy4UOKsUrGw0")}
      >
        Grant ownership of Basic
      </button>
      <button
        type="button"
        class="rounded-md border px-3 py-2 text-sm hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onclick={() => grantOwnership("prod_56sJIyL7piLCVv270n4KBz")}
      >
        Grant ownership of Premium
      </button>
    </div>

    {#if grantError}
      <p class="text-sm text-red-600">{grantError}</p>
    {/if}

    <Product.Group api={connectedApi} transition={upgradeTransitions}>
      <Product.Item
        type="one-time"
        productId="prod_4Di7Lkhf3TXy4UOKsUrGw0"
        title="Basic"
        description="Entry-level one-time product"
      />
      <Product.Item
        type="one-time"
        productId="prod_56sJIyL7piLCVv270n4KBz"
        title="Premium"
        description="Higher-tier one-time product"
      />
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
      title="Credit Top-Up"
      description="Buy credits any time you need more."
    />
  </section>
</main>
