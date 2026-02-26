<script lang="ts">
  import IconButton from "./IconButton.svelte";
  import Input from "./Input.svelte";

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    compact?: boolean;
    disabled?: boolean;
    className?: string;
    onValueChange?: (value: number) => void | Promise<void>;
  }

  let {
    value = 1,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    step = 1,
    compact = false,
    disabled = false,
    className = "",
    onValueChange,
  }: Props = $props();

  const clamp = (candidate: number) => Math.min(max, Math.max(min, candidate));

  const setValue = (candidate: number) => {
    const next = clamp(candidate);
    onValueChange?.(next);
  };

  const decrement = () => setValue((value ?? 0) - step);
  const increment = () => setValue((value ?? 0) + step);
</script>

<div class={`number-input ${className}`}>
  <IconButton
    ariaLabel="Decrease value"
    {disabled}
    onClick={decrement}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8H13" stroke="currentColor" stroke-width="1.58" stroke-linecap="round" />
    </svg>
  </IconButton>

  <Input
    type="number"
    variant="ghost"
    className={`${compact ? "number-input-value-compact" : "number-input-value"} input-no-spinner`}
    value={value}
    {disabled}
    onValueChange={(raw) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      setValue(parsed);
    }}
  />

  <IconButton
    ariaLabel="Increase value"
    {disabled}
    onClick={increment}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      <path d="M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </IconButton>
</div>
