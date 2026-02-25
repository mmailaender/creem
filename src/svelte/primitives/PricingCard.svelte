<script lang="ts">
  import CheckoutButton from "./CheckoutButton.svelte";
  import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
  import type { ConnectedProduct } from "../widgets/types.js";
  import { resolveProductIdForPlan, formatPriceWithInterval, formatSeatPrice } from "./shared.js";

  interface Props {
    plan: UIPlanEntry;
    selectedCycle?: RecurringCycle;
    activePlanId?: string | null;
    subscriptionProductId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionTrialEnd?: string | null;
    products?: ConnectedProduct[];
    units?: number;
    showSeatPicker?: boolean;
    subscribedSeats?: number | null;
    isGroupSubscribed?: boolean;
    className?: string;
    onCheckout?: (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => Promise<void> | void;
    onSwitchPlan?: (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => Promise<void> | void;
    onUpdateSeats?: (payload: { units: number }) => Promise<void> | void;
    onContactSales?: (payload: { plan: UIPlanEntry }) => Promise<void> | void;
  }

  let {
    plan,
    selectedCycle = undefined,
    activePlanId = undefined,
    subscriptionProductId = null,
    subscriptionStatus = null,
    subscriptionTrialEnd = null,
    products = [],
    units = undefined,
    showSeatPicker = false,
    subscribedSeats = null,
    isGroupSubscribed = false,
    className = "",
    onCheckout,
    onSwitchPlan,
    onUpdateSeats,
    onContactSales,
  }: Props = $props();

  const isSeatPlan = $derived(plan.pricingModel === "seat");
  let seatCount = $state(1);
  let seatAdjustCount = $state(1);
  let editingSeats = $state(false);
  $effect(() => {
    seatCount = units ?? 1;
  });
  $effect(() => {
    seatAdjustCount = subscribedSeats ?? units ?? 1;
    editingSeats = false;
  });
  const effectiveUnits = $derived(
    isSeatPlan ? (showSeatPicker ? seatCount : units) : undefined,
  );

  const productId = $derived(resolveProductIdForPlan(plan, selectedCycle));
  const priceLabel = $derived(formatPriceWithInterval(productId, products));

  // Exact match: user is subscribed to THIS specific product (plan + cycle)
  const isActiveProduct = $derived(
    subscriptionProductId != null && productId != null && productId === subscriptionProductId,
  );
  const isTrialing = $derived(isActiveProduct && subscriptionStatus === "trialing");
  const trialDaysLeft = $derived.by(() => {
    if (!isTrialing || !subscriptionTrialEnd) return null;
    const end = new Date(subscriptionTrialEnd).getTime();
    const now = Date.now();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return days;
  });
  // Same plan but different billing cycle — offer to switch interval
  const isActivePlanOtherCycle = $derived(
    !isActiveProduct && activePlanId === plan.planId && productId != null,
  );
  // Sibling plan in the same <Subscription> group that already has a subscription
  const isSiblingPlan = $derived(
    !isActiveProduct && !isActivePlanOtherCycle && isGroupSubscribed && productId != null && plan.category !== "free" && plan.category !== "enterprise",
  );

  const seatPriceLabel = $derived(
    isActiveProduct && isSeatPlan && subscribedSeats
      ? formatSeatPrice(productId, products, subscribedSeats)
      : null,
  );
  const seatsChanged = $derived(
    isActiveProduct && isSeatPlan && subscribedSeats != null && seatAdjustCount !== subscribedSeats,
  );

  const checkoutLabel = $derived(
    isActivePlanOtherCycle
      ? "Switch interval"
      : isSiblingPlan
        ? "Switch plan"
        : plan.billingType === "onetime"
          ? "Buy now"
          : "Subscribe",
  );
  const handleCheckout = (payload: { productId: string }) => {
    if (isSiblingPlan && onSwitchPlan) {
      onSwitchPlan({ plan, productId: payload.productId, units: isSeatPlan ? (subscribedSeats ?? effectiveUnits) : effectiveUnits });
    } else {
      onCheckout?.({ plan, productId: payload.productId, units: effectiveUnits });
    }
  };
</script>

<section
  class={`relative flex flex-col rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 ${
    plan.recommended
      ? "border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:ring-indigo-400/20"
      : "border-zinc-200 dark:border-zinc-800"
  } ${className}`}
>
  {#if plan.recommended}
    <span
      class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white dark:bg-indigo-500"
    >
      Recommended
    </span>
  {/if}

  <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
    {plan.title ?? plan.planId}
  </h3>

  {#if plan.description}
    <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
      {plan.description}
    </p>
  {/if}

  <div class="mt-3 mb-4">
    {#if plan.category === "free"}
      <span class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Free</span>
    {:else if plan.category === "enterprise"}
      <span class="text-lg font-medium text-zinc-600 dark:text-zinc-300">Custom pricing</span>
    {:else if seatPriceLabel}
      <span class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{seatPriceLabel}</span>
    {:else if priceLabel}
      <span class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{priceLabel}</span>
    {/if}
  </div>

  {#if isSeatPlan && showSeatPicker && !isActiveProduct && !isSiblingPlan}
    <div class="mb-4 flex items-center gap-2">
      <label class="text-sm text-zinc-600 dark:text-zinc-300">Seats</label>
      <input
        type="number"
        min="1"
        value={seatCount}
        oninput={(e: Event) => {
          const val = parseInt((e.target as HTMLInputElement).value, 10);
          if (val > 0) seatCount = val;
        }}
        class="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </div>
  {/if}

  {#if isActiveProduct && isSeatPlan && showSeatPicker && onUpdateSeats}
    {#if editingSeats}
      <div class="mb-4 flex items-center gap-2">
        <label class="text-sm text-zinc-600 dark:text-zinc-300">Seats</label>
        <input
          type="number"
          min="1"
          value={seatAdjustCount}
          oninput={(e: Event) => {
            const val = parseInt((e.target as HTMLInputElement).value, 10);
            if (val > 0) seatAdjustCount = val;
          }}
          class="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {#if seatsChanged}
          <button
            type="button"
            class="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            onclick={() => onUpdateSeats?.({ units: seatAdjustCount })}
          >
            Update
          </button>
        {/if}
        <button
          type="button"
          class="text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onclick={() => { seatAdjustCount = subscribedSeats ?? 1; editingSeats = false; }}
        >
          Cancel
        </button>
      </div>
    {:else}
      <button
        type="button"
        class="mb-4 text-sm text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        onclick={() => { editingSeats = true; }}
      >
        Change seats
      </button>
    {/if}
  {/if}

  <div class="mt-auto">
    {#if isActiveProduct && isTrialing}
      <div class="space-y-1">
        <span
          class="inline-flex rounded-md bg-sky-100 px-3 py-2 text-sm font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        >
          Free trial{#if trialDaysLeft != null}&ensp;·&ensp;{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left{/if}
        </span>
      </div>
    {:else if isActiveProduct}
      <span
        class="inline-flex rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      >
        Current plan
      </span>
    {:else if isSiblingPlan && productId}
      <CheckoutButton {productId} onCheckout={handleCheckout}>
        {checkoutLabel}
      </CheckoutButton>
    {:else if plan.category === "enterprise"}
      {#if plan.contactUrl}
        <a
          href={plan.contactUrl}
          class="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:text-zinc-100 hover:dark:bg-zinc-800"
        >
          Contact sales
        </a>
      {:else if onContactSales}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
          onclick={() => onContactSales?.({ plan })}
        >
          Contact sales
        </button>
      {/if}
    {:else if productId}
      <CheckoutButton {productId} onCheckout={handleCheckout}>
        {checkoutLabel}
      </CheckoutButton>
    {:else if plan.category !== "free"}
      <span class="text-sm text-zinc-500 dark:text-zinc-400">
        Configure a checkout handler to activate this plan.
      </span>
    {/if}
  </div>
</section>
