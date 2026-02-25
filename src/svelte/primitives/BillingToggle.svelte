<script lang="ts">
  /* global $props */
  import type { RecurringCycle } from "../../core/types.js";
  import { formatRecurringCycle } from "./shared.js";
  import SegmentControl from "./SegmentControl.svelte";

  interface Props {
    cycles?: RecurringCycle[];
    value?: RecurringCycle;
    onValueChange?: (cycle: RecurringCycle) => void;
    className?: string;
  }

  let { cycles = [], value, onValueChange, className = "" }: Props = $props();
</script>

{#if cycles.length > 1}
  <SegmentControl
    items={cycles.map((cycle) => ({
      value: cycle,
      label: formatRecurringCycle(cycle),
    }))}
    value={value}
    onValueChange={(segment) => onValueChange?.(segment as RecurringCycle)}
    className={className}
  />
{/if}
