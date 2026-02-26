<script lang="ts">
  import { setupConvex } from "convex-svelte";
  import {
    CheckoutSuccessSummary,
    BillingPortal,
    Link,
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

  const convexLogoUrl =
    "https://www.figma.com/api/mcp/asset/9cd60b11-6db1-421e-82a7-bb5054a462b1";
  const svelteLogoUrl =
    "https://www.figma.com/api/mcp/asset/934d6769-1447-46dc-9a45-7138ec3f2eff";
</script>

<main class="w-full py-10 lg:pt-16">
  <header class="border-b border-border-subtle pb-16 lg:pb-[104px]">
    <div class="mx-auto w-full max-w-[1280px] px-4 lg:px-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-2">
      <div class="lg:col-span-7 space-y-6">
        <h1 class="display-m max-w-[720px] text-foreground-default">
          Connected Billing Widgets
        </h1>
        <p class="subtitle-m max-w-[720px] text-foreground-default">
          These widgets query Convex directly through the Creem wrapper API
          using convex-svelte, with backend-derived billing state in the UI
          model.
        </p>
        <div class="flex items-center gap-4 pt-8 text-foreground-placeholder">
          <span class="label-l">CREEM</span>
          <span class="inline-flex h-8 w-8 items-center justify-center opacity-70">
            <img src={convexLogoUrl} alt="Convex" class="h-7 w-7" />
          </span>
          <span class="inline-flex h-8 w-8 items-center justify-center opacity-70">
            <img src={svelteLogoUrl} alt="Svelte" class="h-7 w-7" />
          </span>
        </div>
      </div>

      <nav class="lg:col-start-10 lg:col-span-3 space-y-10 lg:pt-2">
        <div class="space-y-4">
          <p class="label-m text-foreground-placeholder">SUBSCRIPTIONS WIDGETS</p>
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">01</span>
              <Link href="#subscription-with-trial">With Trial (4 Cycles)</Link>
            </div>
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">02</span>
              <Link href="#subscription-without-trial">Without Trial (Monthly Only)</Link>
            </div>
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">03</span>
              <Link href="#subscription-seat-selectable">Seat-Based (User-Selectable)</Link>
            </div>
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">04</span>
              <Link href="#subscription-seat-auto">Seat-Based (Auto-Derived)</Link>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <p class="label-m text-foreground-placeholder">ONE TIME PURCHASE WIDGETS</p>
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">05</span>
              <Link href="#onetime-single">Single One-Time Product</Link>
            </div>
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">06</span>
              <Link href="#onetime-group">Mutually Exclusive Product Group</Link>
            </div>
            <div class="flex items-center gap-3">
              <span class="label-m text-foreground-placeholder inline-block w-6 shrink-0">07</span>
              <Link href="#onetime-repeat">Repeating Product (Consumable)</Link>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </header>

  <div class="mx-auto w-full max-w-[1280px] px-4 lg:px-16 space-y-14 pt-14">
  <CheckoutSuccessSummary
    class="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
  />

  <!-- ─── Section 1: Subscriptions with trial (all 4 billing cycles) ─── -->
  <section id="subscription-with-trial" class="space-y-3">
    <h2 class="text-xl font-semibold">
      1. Subscription — With Trial (4 Cycles)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      All four billing cycles are available. The toggle derives from the
      registered plans automatically.
    </p>
    <Subscription.Root api={connectedApi} class="space-y-4">
      <Subscription.Item
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
      <Subscription.Item
        planId="basic"
        type="single"
        productIds={{
          "every-month": "prod_4if4apw1SzOXSUAfGL0Jp9",
          "every-three-months": "prod_5SxwV6WbbluzUQ2FmZ4trD",
          "every-six-months": "prod_7Lhs8en6kiBONIywQUlaQC",
          "every-year": "prod_KE9mMfH58482NIbKgK4nF",
        }}
      />
      <Subscription.Item
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
      <Subscription.Item
        type="enterprise"
        title="Enterprise"
        description={`✔️ Up to 3 users

✔️ Basic task management

✔️ Drag & drop builder

✔️ Task deadlines & reminders

✔️ Mobile access

✔️ Priority support

✔️ 1-1 calls
`}
        contactUrl="https://creem.io"
      />
    </Subscription.Root>
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ─── Section 2: Subscriptions without trial (monthly only) ─── -->
  <section id="subscription-without-trial" class="space-y-3">
    <h2 class="text-xl font-semibold">
      2. Subscription — Without Trial (Monthly Only)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Only monthly products registered. The billing toggle should not appear.
    </p>
    <Subscription.Root api={connectedApi} class="space-y-4">
      <Subscription.Item
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
      <Subscription.Item
        type="single"
        productIds={{ "every-month": "prod_53CU7duHB58lGTUqKlRroI" }}
      />
      <Subscription.Item
        type="single"
        productIds={{ "every-month": "prod_3ymOe55fDzKgmPoZnPEOBq" }}
      />
      <Subscription.Item
        type="enterprise"
        title="Enterprise"
        description={`✔️ Up to 3 users

✔️ Basic task management

✔️ Drag & drop builder

✔️ Task deadlines & reminders

✔️ Mobile access

✔️ Priority support

✔️ 1-1 calls`}
        contactUrl="https://creem.io"
      />
    </Subscription.Root>
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ─── Section 3: Seat-based subscriptions ─── -->
  <section id="subscription-seat-selectable" class="space-y-3">
    <h2 class="text-xl font-semibold">
      3. Subscription — Seat-Based (User-Selectable)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Seat-based plans with a quantity picker. The user selects how many seats
      before checkout.
    </p>
    <Subscription.Root api={connectedApi} class="space-y-4" showSeatPicker>
      <Subscription.Item
        type="seat-based"
        productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
      />
      <Subscription.Item
        type="seat-based"
        productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
      />
    </Subscription.Root>
    <BillingPortal api={connectedApi} />
  </section>

  <!-- ─── Section 3b: Seat-based with auto-derived units ─── -->
  <section id="subscription-seat-auto" class="space-y-3">
    <h2 class="text-xl font-semibold">
      3b. Subscription — Seat-Based (Auto-Derived)
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Same seat-based products but with a fixed unit count (e.g. derived from
      organization member count). No picker shown — hardcoded to 5 seats.
    </p>
    <Subscription.Root api={connectedApi} class="space-y-4" units={5}>
      <Subscription.Item
        type="seat-based"
        productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
      />
      <Subscription.Item
        type="seat-based"
        productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
      />
    </Subscription.Root>
  </section>

  <!-- ─── Section 4: Standalone one-time product ─── -->
  <section id="onetime-single" class="space-y-3">
    <h2 class="text-xl font-semibold">4. Single One-Time Product</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      A standalone product purchased once. Shows "Owned" after purchase.
    </p>
    <Product.Root api={connectedApi}>
      <Product.Item
        type="one-time"
        productId="prod_6npEfkzgtr9hSqdWd7fqKG"
      />
    </Product.Root>
  </section>

  <!-- ─── Section 5: Mutually exclusive product group with upgrade ─── -->
  <section id="onetime-group" class="space-y-3">
    <h2 class="text-xl font-semibold">5. Mutually Exclusive Product Group</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Transition graph decides available upgrade paths. Upgrading from Basic to
      Premium uses a dedicated delta product. Buy first the Basic Product and
      then upgrade to Premium.
    </p>

    <Product.Root api={connectedApi} transition={upgradeTransitions}>
      <Product.Item type="one-time" productId="prod_4Di7Lkhf3TXy4UOKsUrGw0" />
      <Product.Item type="one-time" productId="prod_56sJIyL7piLCVv270n4KBz" />
    </Product.Root>
  </section>

  <!-- ─── Section 6: Repeating (consumable) product ─── -->
  <section id="onetime-repeat" class="space-y-3">
    <h2 class="text-xl font-semibold">6. Repeating Product (Consumable)</h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Can be purchased multiple times. No "Owned" badge — always shows the
      purchase button.
    </p>
    <Product.Root api={connectedApi}>
      <Product.Item
        type="recurring"
        productId="prod_73CnZ794MaJ1DUn8MU0O5f"
      />
    </Product.Root>
  </section>
  </div>
</main>
