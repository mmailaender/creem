<script lang="ts">
  /* global $props */
  import { Ark } from "@ark-ui/svelte/factory";
  import type { RecurringCycle } from "../../core/types.js";
  import { formatRecurringCycle } from "./shared.js";

  interface Props {
    cycles?: RecurringCycle[];
    value?: RecurringCycle;
    onValueChange?: (cycle: RecurringCycle) => void;
    className?: string;
  }

  let { cycles = [], value, onValueChange, className = "" }: Props = $props();
</script>

{#if cycles.length > 1}
  <Ark
    as="div"
    role="tablist"
    aria-label="Billing interval"
    class={`inline-flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
  >
    {#each cycles as cycle (cycle)}
      <Ark
        as="button"
        type="button"
        role="tab"
        aria-selected={cycle === value}
        class={`rounded-md px-3 py-1.5 text-sm transition ${
          cycle === value
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
        onclick={() => onValueChange?.(cycle)}
      >
        {formatRecurringCycle(cycle)}
      </Ark>
    {/each}
  </Ark>
{/if}
