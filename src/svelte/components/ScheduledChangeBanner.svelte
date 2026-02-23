<script lang="ts">
  /* global $props, $derived */
  import { Ark } from "@ark-ui/svelte/factory";
  import type { BillingSnapshot } from "../../core/types.js";

  interface Props {
    snapshot?: BillingSnapshot | null;
    className?: string;
    isLoading?: boolean;
    onResume?: () => void;
  }

  let { snapshot = null, className = "", isLoading = false, onResume = undefined }: Props = $props();

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
    class={`flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
  >
    <Ark as="span">
      Plan cancellation scheduled{#if currentPeriodEnd}
        for {new Date(currentPeriodEnd).toLocaleDateString()}{/if}.
    </Ark>
    {#if onResume}
      <Ark
        as="button"
        type="button"
        class="shrink-0 rounded-md border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-200 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-800/60"
        disabled={isLoading}
        onclick={onResume}
      >
        {isLoading ? "Resuming…" : "Undo cancellation"}
      </Ark>
    {/if}
  </Ark>
{/if}
