<script lang="ts">
  import BillingToggle from "./BillingToggle.svelte";
  import PricingCard from "./PricingCard.svelte";
  import type { BillingSnapshot, UIPlanEntry, RecurringCycle } from "../../core/types.js";
  import type { ConnectedProduct } from "../widgets/types.js";

  interface Props {
    plans?: UIPlanEntry[];
    snapshot?: BillingSnapshot | null;
    selectedCycle?: RecurringCycle;
    products?: ConnectedProduct[];
    subscriptionProductId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionTrialEnd?: string | null;
    units?: number;
    showSeatPicker?: boolean;
    subscribedSeats?: number | null;
    isGroupSubscribed?: boolean;
    disableCheckout?: boolean;
    disableSwitch?: boolean;
    disableSeats?: boolean;
    className?: string;
    onCycleChange?: (cycle: RecurringCycle) => void;
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
    plans = [],
    snapshot = null,
    selectedCycle = undefined,
    products = [],
    subscriptionProductId = null,
    subscriptionStatus = null,
    subscriptionTrialEnd = null,
    units = undefined,
    showSeatPicker = false,
    subscribedSeats = null,
    isGroupSubscribed = false,
    disableCheckout = false,
    disableSwitch = false,
    disableSeats = false,
    className = "",
    onCycleChange,
    onCheckout,
    onSwitchPlan,
    onUpdateSeats,
    onContactSales,
  }: Props = $props();

  const toUniqueCycles = (entries: UIPlanEntry[]) => {
    const set = new Set<RecurringCycle>();
    for (const plan of entries) {
      for (const cycle of plan.billingCycles ?? []) {
        set.add(cycle);
      }
    }
    return Array.from(set);
  };

  const availableCycles = $derived(toUniqueCycles(plans));
  const effectiveCycle = $derived(
    selectedCycle ?? snapshot?.recurringCycle ?? availableCycles[0],
  );
  const showToggle = $derived(availableCycles.length > 1);
</script>

<section class={`space-y-4 ${className}`}>
  {#if showToggle}
    <BillingToggle
      cycles={availableCycles}
      value={effectiveCycle}
      onValueChange={onCycleChange}
    />
  {/if}

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each plans as plan (plan.planId)}
      <PricingCard
        {plan}
        selectedCycle={effectiveCycle}
        activePlanId={snapshot?.activePlanId}
        {subscriptionProductId}
        {subscriptionStatus}
        {subscriptionTrialEnd}
        {products}
        {units}
        {showSeatPicker}
        {subscribedSeats}
        {isGroupSubscribed}
        {disableCheckout}
        {disableSwitch}
        {disableSeats}
        {onCheckout}
        {onSwitchPlan}
        {onUpdateSeats}
        {onContactSales}
      />
    {/each}
  </div>
</section>
