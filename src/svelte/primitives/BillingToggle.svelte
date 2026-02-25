<script lang="ts">
  /* global $props */
  import { Tabs } from "@ark-ui/svelte/tabs";
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
  <Tabs.Root
    value={value}
    onValueChange={(details: { value: string }) => onValueChange?.(details.value as RecurringCycle)}
    class={`inline-flex ${className}`}
  >
    <Tabs.List
      class="inline-flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {#each cycles as cycle (cycle)}
        <Tabs.Trigger
          value={cycle}
          class={`relative rounded-md px-3 py-1.5 text-sm transition cursor-pointer ${
            cycle === value
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {formatRecurringCycle(cycle)}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
{/if}
