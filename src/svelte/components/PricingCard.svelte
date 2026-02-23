<script lang="ts">
  import { Ark } from "@ark-ui/svelte/factory";
  import CheckoutButton from "./CheckoutButton.svelte";
  import type { PlanCatalogEntry, RecurringCycle } from "../../core/types.js";
  import { formatRecurringCycle, resolveProductIdForPlan } from "./shared.js";

  interface Props {
    plan: PlanCatalogEntry;
    selectedCycle?: RecurringCycle;
    activePlanId?: string | null;
    className?: string;
    onCheckout?: (payload: {
      plan: PlanCatalogEntry;
      productId: string;
    }) => Promise<void> | void;
    onContactSales?: (payload: { plan: PlanCatalogEntry }) => Promise<void> | void;
  }

  let {
    plan,
    selectedCycle = undefined,
    activePlanId = undefined,
    className = "",
    onCheckout,
    onContactSales,
  }: Props = $props();

  const isActive = $derived(activePlanId === plan.planId);
  const productId = $derived(resolveProductIdForPlan(plan, selectedCycle));
  const checkoutLabel = $derived(
    plan.billingType === "onetime" ? "Buy now" : "Start checkout",
  );
  const handleCheckout = (payload: { productId: string }) =>
    onCheckout?.({ plan, productId: payload.productId });
</script>

<Ark
  as="section"
  class={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
>
  <Ark as="div" class="mb-2 flex items-center justify-between gap-2">
    <Ark as="h3" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
      {plan.displayName}
    </Ark>
    <Ark
      as="span"
      class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
    >
      {plan.category}
    </Ark>
  </Ark>

  {#if plan.description}
    <Ark as="p" class="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
      {plan.description}
    </Ark>
  {/if}

  {#if plan.billingCycles && plan.billingCycles.length > 0}
    <Ark as="p" class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
      Available cycles: {plan.billingCycles.map(formatRecurringCycle).join(" · ")}
    </Ark>
  {/if}

  {#if isActive}
    <Ark
      as="span"
      class="inline-flex rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    >
      Current plan
    </Ark>
  {:else if plan.category === "enterprise"}
    {#if plan.contactUrl}
      <Ark
        as="a"
        href={plan.contactUrl}
        class="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:text-zinc-100 hover:dark:bg-zinc-800"
      >
        Contact sales
      </Ark>
    {:else if onContactSales}
      <Ark
        as="button"
        type="button"
        class="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
        onclick={() => onContactSales?.({ plan })}
      >
        Contact sales
      </Ark>
    {/if}
  {:else if productId}
    <CheckoutButton {productId} onCheckout={handleCheckout}>
      {checkoutLabel}
    </CheckoutButton>
  {:else}
    <Ark as="span" class="text-sm text-zinc-500 dark:text-zinc-400">
      Configure a checkout handler to activate this plan.
    </Ark>
  {/if}
</Ark>
