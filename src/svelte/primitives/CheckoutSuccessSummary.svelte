<script lang="ts">
  /* global $props, $derived */
  import { Ark } from "@ark-ui/svelte/factory";
  import {
    hasCheckoutSuccessParams,
    parseCheckoutSuccessParams,
  } from "../../core/payments.js";
  import type { CheckoutSuccessParams } from "../../core/types.js";

  interface Props {
    params?: CheckoutSuccessParams;
    search?: string;
    className?: string;
  }

  let { params = undefined, search = "", className = "" }: Props = $props();

  const parsed = $derived(params ?? parseCheckoutSuccessParams(search));
  const show = $derived(hasCheckoutSuccessParams(parsed));
</script>

{#if show}
  <Ark
    as="div"
    class={`rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 ${className}`}
  >
    <Ark as="p" class="font-medium">Checkout completed successfully.</Ark>
    <Ark as="ul" class="mt-2 space-y-1">
      {#if parsed.checkoutId}<li>Checkout: {parsed.checkoutId}</li>{/if}
      {#if parsed.orderId}<li>Order: {parsed.orderId}</li>{/if}
      {#if parsed.customerId}<li>Customer: {parsed.customerId}</li>{/if}
      {#if parsed.productId}<li>Product: {parsed.productId}</li>{/if}
      {#if parsed.requestId}<li>Request: {parsed.requestId}</li>{/if}
    </Ark>
  </Ark>
{/if}
