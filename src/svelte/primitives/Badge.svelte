<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    color?: "neutral" | "primary";
    variant?: "faded" | "filled";
    className?: string;
    children?: Snippet;
  }

  let {
    color = "primary",
    variant = "filled",
    className = "",
    children,
  }: Props = $props();

  const variantClass = $derived(
    color === "primary" && variant === "filled"
      ? "badge-primary-filled"
      : "badge-neutral-faded",
  );
</script>

<span class={`badge ${variantClass} ${className}`}>
  {#if children}
    {@render children()}
  {:else if color === "primary" && variant === "filled"}
    Recommended
  {:else}
    Current plan
  {/if}
</span>
