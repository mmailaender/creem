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
    <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor" class="h-4 w-4 text-foreground-on-tonal">
      <path d="M216,128a12,12,0,0,1-12,12H52a12,12,0,0,1,0-24H204A12,12,0,0,1,216,128Z" />
    </svg>
  </IconButton>

  <Input
    type="number"
    variant="ghost"
    className={`${compact ? "number-input-value-compact" : "number-input-value"} max-w-12 input-no-spinner`}
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
    <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor" class="h-4 w-4 text-foreground-on-tonal">
      <path d="M216,128a12,12,0,0,1-12,12H140v64a12,12,0,0,1-24,0V140H52a12,12,0,0,1,0-24h64V52a12,12,0,0,1,24,0v64h64A12,12,0,0,1,216,128Z" />
    </svg>
  </IconButton>
</div>
