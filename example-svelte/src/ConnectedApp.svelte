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
    getBillingUiModel: api.example.getBillingUiModel,
    generateCheckoutLink: api.example.generateCheckoutLink,
    generateCustomerPortalUrl: api.example.generateCustomerPortalUrl,
    syncProducts: api.example.syncBillingProducts,
    createDemoUser: api.example.createDemoUser,
    grantDemoEntitlement: api.example.grantDemoEntitlement,
  };

  const transitions: Transition[] = [
    {
      from: "prod_3tqZFdQNMukL0AevNgjH03",
      to: "prod_Cb7ydeGmcxuC383ItErhf",
      kind: "via_product",
      viaProductId: "prod_4uNmv0F22pqaDQL8xnI5hA",
    },
  ];

  const convex = useConvexClient();
  let grantError = $state<string | null>(null);

  const grantOwnership = async (productId: string) => {
    grantError = null;
    try {
      await convex.mutation(api.example.grantDemoEntitlement, {
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

<main class="mx-auto max-w-6xl px-4 py-10 space-y-10">
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

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Subscription</h2>
    <Subscription api={connectedApi} className="space-y-4">
      <Subscription.Plan
        planId="free"
        type="free"
        displayName="Free"
        description="Start here with limited access"
      />
      <Subscription.Plan
        planId="basic"
        type="single"
        displayName="Basic"
        description="Monthly or yearly access"
        productIds={{
          default: "prod_3tqZFdQNMukL0AevNgjH03",
          "every-month": "prod_3tqZFdQNMukL0AevNgjH03",
          "every-year": "prod_4uNmv0F22pqaDQL8xnI5hA",
        }}
      />
      <Subscription.Plan
        planId="premium"
        type="seat-based"
        displayName="Premium"
        description="Advanced capabilities"
        productIds={{
          default: "prod_Cb7ydeGmcxuC383ItErhf",
          "every-month": "prod_3tqZFdQNMukL0AevNgjH03",
          "every-year": "prod_Cb7ydeGmcxuC383ItErhf",
        }}
      />
      <Subscription.Plan
        planId="enterprise"
        type="enterprise"
        displayName="Enterprise"
        description="Custom procurement and support"
        contactUrl="https://creem.io"
      />
    </Subscription>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Single Product</h2>
    <Product
      api={connectedApi}
      type="one-time"
      productId="prod_6qIqmMqX49oO25XGUAFpyR"
      title="Credits Pack"
      description="Buy credits once and keep them."
    />
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Mutually Exclusive Product Group</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Transition graph decides available upgrade paths. In this demo, upgrading
      from A to B uses a dedicated delta product.
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-md border px-3 py-2 text-sm hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onclick={() => grantOwnership("prod_3tqZFdQNMukL0AevNgjH03")}
      >
        Grant ownership of product A
      </button>
      <button
        type="button"
        class="rounded-md border px-3 py-2 text-sm hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onclick={() => grantOwnership("prod_Cb7ydeGmcxuC383ItErhf")}
      >
        Grant ownership of product B
      </button>
    </div>

    {#if grantError}
      <p class="text-sm text-red-600">{grantError}</p>
    {/if}

    <Product.Group api={connectedApi} transition={transitions}>
      <Product.Item
        type="one-time"
        productId="prod_3tqZFdQNMukL0AevNgjH03"
        title="Product A"
        description="Entry one-time product"
      />
      <Product.Item
        type="one-time"
        productId="prod_Cb7ydeGmcxuC383ItErhf"
        title="Product B"
        description="Higher-tier one-time product"
      />
    </Product.Group>
  </section>
</main>
