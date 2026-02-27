<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    color?: "neutral" | "primary";
    variant?: "faded" | "filled";
    size?: "m" | "s";
    className?: string;
    children?: Snippet;
  }

  let {
    color = "primary",
    variant = "filled",
    size = "m",
    className = "",
    children,
  }: Props = $props();

  const variantClass = $derived(
    color === "primary" && variant === "filled"
      ? "badge-primary-filled"
      : "badge-neutral-faded",
  );

  const sizeClass = $derived(size === "s" ? "badge-s" : "");
</script>

<span class={`badge ${sizeClass} ${variantClass} ${className}`}>
  {#if children}
    {@render children()}
  {:else if color === "primary" && variant === "filled"}
    Recommended
  {:else}
    Current plan
  {/if}
</span>
