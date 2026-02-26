<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    href?: string;
    className?: string;
    endIcon?: boolean;
    disabled?: boolean;
    children?: Snippet;
    icon?: Snippet;
  }

  let {
    href = "#",
    className = "",
    endIcon = false,
    disabled = false,
    children,
    icon,
  }: Props = $props();
</script>

<a
  href={disabled ? undefined : href}
  aria-disabled={disabled}
  class={`link-inline ${className}`}
>
  {#if children}
    {@render children()}
  {:else}
    Link
  {/if}

  {#if endIcon}
    <span class="link-inline-icon" aria-hidden="true">
      {#if icon}
        {@render icon()}
      {:else}
        →
      {/if}
    </span>
  {/if}
</a>
