<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
    onClick?: () => void | Promise<void>;
    children?: Snippet;
  }

  let {
    type = "button",
    disabled = false,
    className = "",
    ariaLabel = "Icon button",
    onClick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  {disabled}
  aria-label={ariaLabel}
  class={`icon-button icon-button-sm ${className}`}
  on:click={onClick}
>
  {#if children}
    {@render children()}
  {:else}
    <span aria-hidden="true" class="text-[16px] leading-none">+</span>
  {/if}
</button>
