<script lang="ts">
  import CheckoutButton from "./CheckoutButton.svelte";
  import Badge from "./Badge.svelte";
  import NumberInput from "./NumberInput.svelte";
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
    disableCheckout?: boolean;
    disableSwitch?: boolean;
    disableSeats?: boolean;
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
    onCancelSubscription?: () => void;
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
    disableCheckout = false,
    disableSwitch = false,
    disableSeats = false,
    className = "",
    onCheckout,
    onSwitchPlan,
    onUpdateSeats,
    onContactSales,
    onCancelSubscription,
  }: Props = $props();

  const isSeatPlan = $derived(plan.pricingModel === "seat");
  const isEnterprise = $derived(plan.category === "enterprise");
  let seatCount = $derived(1);
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
  // Free plan is active when activePlanId matches and the plan has no product (no subscription)
  const isActiveFreePlan = $derived(
    !isActiveProduct && plan.category === "free" && activePlanId === plan.planId,
  );
  // Sibling plan in the same <Subscription> group that already has a subscription
  const isSiblingPlan = $derived(
    !isActiveProduct && !isActivePlanOtherCycle && isGroupSubscribed && productId != null && plan.category !== "free" && plan.category !== "enterprise",
  );
  const showSeatCheckoutControls = $derived(
    isSeatPlan && showSeatPicker && !isActiveProduct && !isSiblingPlan,
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

  const splitPriceLabel = (value: string | null): { main: string; suffix: string | null; tail: string } | null => {
    if (!value) return null;
    const match = value.match(/^(.*?)(\/[a-z0-9]+)(.*)$/i);
    if (!match) return { main: value, suffix: null, tail: "" };
    return {
      main: match[1]?.trim() ?? value,
      suffix: match[2] ?? null,
      tail: match[3]?.trim() ?? "",
    };
  };

  const splitPrice = $derived(splitPriceLabel(seatPriceLabel ?? priceLabel));

  const descriptionLines = $derived.by<string[]>(() => {
    if (!plan.description) return [];
    return plan.description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^(?:[-*]\s+|[✔✓]\s*)/, "").trim())
      .filter(Boolean);
  });

  const featureLines = $derived.by<string[]>(() => {
    if (descriptionLines.length < 3) return [];
    return descriptionLines;
  });

  const leadDescription = $derived.by<string | null>(() => {
    if (!descriptionLines.length || featureLines.length > 0) return null;
    return descriptionLines[0] ?? null;
  });
</script>

<section
  class={`relative flex flex-col rounded-2xl bg-surface-base p-6 ${
    isEnterprise
      ? " md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-x-8 md:gap-y-3"
      : ""
  } ${
    plan.recommended ? "border border-brand-default" : ""
  } ${className}`}
>
  <div class="mb-3 flex h-5 items-center justify-between gap-2">
    <h3 class="title-m text-foreground-default">
      {plan.title ?? plan.planId}
    </h3>
    {#if plan.recommended}
      <Badge color="primary" variant="filled">
        Recommended
      </Badge>
    {:else if isActiveProduct || isActiveFreePlan}
      <Badge color="neutral" variant="faded">
        {#if isTrialing}
          Free trial{#if trialDaysLeft != null}&ensp;·&ensp;{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left{/if}
        {:else}
          Current plan
        {/if}
      </Badge>
    {/if}
  </div>

  <div class="flex items-baseline gap-1">
    {#if plan.category === "free"}
      <span class="heading-m text-foreground-default">Free</span>
    {:else if plan.category === "enterprise"}
      <span class="heading-m text-foreground-default">Custom</span>
    {:else if splitPrice}
      <span class="heading-m text-foreground-default">{splitPrice.main}</span>
      {#if splitPrice.suffix}
        <span class="title-s text-foreground-placeholder">{splitPrice.suffix}</span>
      {/if}
      {#if splitPrice.tail}
        <span class="body-m text-foreground-muted">{splitPrice.tail}</span>
      {/if}
    {/if}
  </div>

  {#if leadDescription}
    <p class="mb-4 body-m text-foreground-muted">{leadDescription}</p>
  {/if}

  {#if isActiveProduct && isSeatPlan && showSeatPicker && onUpdateSeats}
    {#if editingSeats}
      <div class="mb-2 flex items-center justify-between rounded-xl bg-surface-subtle py-2 pl-4 pr-2">
        <span class="label-m text-foreground-default">Seats:</span>
        <NumberInput
          value={seatAdjustCount}
          min={1}
          compact
          disabled={disableSeats}
          onValueChange={(next) => {
            if (next > 0) seatAdjustCount = next;
          }}
        />
      </div>
      <div class="mb-4 flex items-center gap-2">
        {#if seatsChanged}
          <button
            type="button"
            disabled={disableSeats}
            class="button-filled h-8"
            onclick={() => onUpdateSeats?.({ units: seatAdjustCount })}
          >
            Update
          </button>
        {/if}
        <button
          type="button"
          class="label-m text-foreground-muted transition hover:text-foreground-default"
          onclick={() => { seatAdjustCount = subscribedSeats ?? 1; editingSeats = false; }}
        >
          Cancel
        </button>
      </div>
    {:else}
      <button
        type="button"
        disabled={disableSeats}
        class="mb-4 label-m text-brand-default transition hover:text-brand-default disabled:cursor-not-allowed disabled:opacity-50"
        onclick={() => { editingSeats = true; }}
      >
        Change seats
      </button>
    {/if}
  {/if}

  <div class={`mb-4 ${isEnterprise ? "mt-2" : "mt-6"} ${showSeatCheckoutControls ? "flex flex-col gap-2" : "flex min-h-8 items-start"}`}>
    {#if showSeatCheckoutControls}
      <div class="flex w-full items-center justify-between rounded-xl bg-surface-subtle py-2 pl-4 pr-2">
        <span class="label-m text-foreground-default">Seats:</span>
        <NumberInput
          value={seatCount}
          min={1}
          compact
          disabled={disableSeats}
          onValueChange={(next) => {
            if (next > 0) seatCount = next;
          }}
        />
      </div>
    {/if}

    <div class={showSeatCheckoutControls ? "w-full" : "flex min-h-8 items-start w-full"}>
    {#if isActiveProduct && onCancelSubscription}
      <button type="button" class="button-outline w-full" onclick={onCancelSubscription}>
        Cancel subscription
      </button>
    {:else if isActiveProduct || isActiveFreePlan}
      <!-- Keep CTA row height but intentionally empty when current plan has no action -->
    {:else if isSiblingPlan && productId}
      <CheckoutButton
        {productId}
        disabled={disableSwitch}
        onCheckout={handleCheckout}
        className={`${plan.recommended ? "button-filled" : "button-faded"} w-full`}
      >
        {checkoutLabel}
      </CheckoutButton>
    {:else if plan.category === "enterprise"}
      {#if plan.contactUrl}
        <a
          href={plan.contactUrl}
          class="button-outline w-full"
        >
          Contact sales
        </a>
      {:else if onContactSales}
        <button
          type="button"
          class="button-outline w-full"
          onclick={() => onContactSales?.({ plan })}
        >
          Contact sales
        </button>
      {/if}
    {:else if productId}
      <CheckoutButton
        {productId}
        disabled={disableCheckout}
        onCheckout={handleCheckout}
        className={`${plan.recommended ? "button-filled" : "button-faded"} w-full`}
      >
        {checkoutLabel}
      </CheckoutButton>
    {:else if plan.category !== "free"}
      <span class="body-m text-foreground-muted">
        Configure a checkout handler to activate this plan.
      </span>
    {/if}
    </div>
  </div>

  {#if featureLines.length > 0}
    <div class={`w-full ${isEnterprise ? "pt-0 md:col-start-2 md:row-span-6 md:self-start" : "pt-4"}`}>
      <p class="title-s mb-4 text-foreground-default">Plan includes:</p>
      <ul class="space-y-2">
        {#each featureLines as feature (feature)}
          <li class="flex items-center gap-2">
            <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center text-foreground-muted">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                class="h-4 w-4"
              >
                <path
                  d="M20 6L9 17L4 12"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span class="body-m text-foreground-default">{feature}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
