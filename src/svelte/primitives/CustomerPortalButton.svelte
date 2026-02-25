<script lang="ts">
  /* global $props, $state */
  import type { Snippet } from "svelte";

  interface Props {
    href?: string;
    disabled?: boolean;
    className?: string;
    onOpenPortal?: () => Promise<void> | void;
    children?: Snippet;
  }

  let {
    href = undefined,
    disabled = false,
    className = "",
    onOpenPortal,
    children,
  }: Props = $props();

  let isLoading = $state(false);

  const handleClick = async () => {
    if (disabled || isLoading || !onOpenPortal) return;
    isLoading = true;
    try {
      await onOpenPortal();
    } finally {
      isLoading = false;
    }
  };
</script>

{#if onOpenPortal}
  <button
    type="button"
    class={`inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 hover:dark:bg-zinc-800 cursor-pointer ${className}`}
    {disabled}
    onclick={handleClick}
  >
    {#if children}
      {@render children()}
    {:else}
      {isLoading ? "Loading..." : "Manage billing"}
    {/if}
  </button>
{:else}
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    class={`inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:text-zinc-100 hover:dark:bg-zinc-800 ${className}`}
  >
    {#if children}
      {@render children()}
    {:else}
      Manage billing
    {/if}
  </a>
{/if}
