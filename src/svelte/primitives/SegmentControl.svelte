<script lang="ts">
  import { SegmentGroup } from "@ark-ui/svelte/segment-group";

  export type SegmentControlItem = {
    label: string;
    value: string;
    disabled?: boolean;
  };

  interface Props {
    items?: SegmentControlItem[];
    value?: string | null;
    defaultValue?: string;
    disabled?: boolean;
    className?: string;
    onValueChange?: (value: string) => void;
  }

  let {
    items = [],
    value = undefined,
    defaultValue = undefined,
    disabled = false,
    className = "",
    onValueChange,
  }: Props = $props();
</script>

{#if items.length > 1}
  <SegmentGroup.Root
    {value}
    {defaultValue}
    {disabled}
    class={`segment-control ${className}`}
    onValueChange={(details: { value: string }) => onValueChange?.(details.value)}
  >
    <SegmentGroup.Indicator class="segment-control-indicator" />
    {#each items as item (item.value)}
      <SegmentGroup.Item
        value={item.value}
        disabled={item.disabled}
        class="segment-control-item"
      >
        <SegmentGroup.ItemText class="segment-control-item-text label-m">
          {item.label}
        </SegmentGroup.ItemText>
        <SegmentGroup.ItemControl class="segment-control-item-control" />
        <SegmentGroup.ItemHiddenInput />
      </SegmentGroup.Item>
    {/each}
  </SegmentGroup.Root>
{/if}
