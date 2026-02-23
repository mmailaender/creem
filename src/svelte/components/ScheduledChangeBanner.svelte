<script lang="ts">
  /* global $props, $derived */
  import { Ark } from "@ark-ui/svelte/factory";
  import type { BillingSnapshot } from "../../core/types.js";

  interface Props {
    snapshot?: BillingSnapshot | null;
    className?: string;
  }

  let { snapshot = null, className = "" }: Props = $props();

  const show = $derived(snapshot?.metadata?.cancelAtPeriodEnd === true);
  const currentPeriodEnd = $derived(
    typeof snapshot?.metadata?.currentPeriodEnd === "string"
      ? snapshot.metadata.currentPeriodEnd
      : undefined,
  );
</script>

{#if show}
  <Ark
    as="div"
    class={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
  >
    Plan cancellation scheduled
    {#if currentPeriodEnd}
      for {new Date(currentPeriodEnd).toLocaleDateString()}.
    {:else}
      .
    {/if}
  </Ark>
{/if}
