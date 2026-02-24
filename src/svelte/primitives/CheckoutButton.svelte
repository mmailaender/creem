<script lang="ts">
  /* global $props, $state */
  import { Ark } from "@ark-ui/svelte/factory";
  import type { Snippet } from "svelte";

  interface Props {
    productId: string;
    href?: string;
    disabled?: boolean;
    className?: string;
    onCheckout?: (payload: { productId: string }) => Promise<void> | void;
    children?: Snippet;
  }

  let {
    productId,
    href = undefined,
    disabled = false,
    className = "",
    onCheckout,
    children,
  }: Props = $props();

  let isLoading = $state(false);

  const handleClick = async () => {
    if (disabled || isLoading || !onCheckout) return;
    isLoading = true;
    try {
      await onCheckout({ productId });
    } finally {
      isLoading = false;
    }
  };
</script>

{#if onCheckout}
  <Ark
    as="button"
    type="button"
    class={`inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    {disabled}
    onclick={handleClick}
  >
    {#if children}
      {@render children()}
    {:else}
      {isLoading ? "Loading..." : "Checkout"}
    {/if}
  </Ark>
{:else}
  <Ark
    as="a"
    href={href}
    class={`inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 ${className}`}
  >
    {#if children}
      {@render children()}
    {:else}
      Checkout
    {/if}
  </Ark>
{/if}
