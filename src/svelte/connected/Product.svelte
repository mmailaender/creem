<script lang="ts">
  import { Ark } from "@ark-ui/svelte/factory";
  import { useConvexClient, useQuery } from "convex-svelte";
  import CheckoutButton from "../components/CheckoutButton.svelte";
  import type { ConnectedBillingApi, ConnectedBillingModel, ProductType } from "./types.js";

  interface Props {
    api: ConnectedBillingApi;
    productId: string;
    type: ProductType;
    title?: string;
    description?: string;
    className?: string;
    successUrl?: string;
  }

  let {
    api,
    productId,
    type,
    title = undefined,
    description = undefined,
    className = "",
    successUrl = undefined,
  }: Props = $props();

  const client = useConvexClient();

  // Capture static function references (these never change at runtime)
  const billingUiModelRef = api.getBillingUiModel;
  const checkoutLinkRef = api.generateCheckoutLink;

  const billingModelQuery = useQuery(billingUiModelRef, {});

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const model = $derived((billingModelQuery.data ?? null) as ConnectedBillingModel | null);
  const owned = $derived(model?.ownedProductIds?.includes(productId) ?? false);
  const resolvedTitle = $derived(
    title ?? model?.allProducts.find((product) => product.id === productId)?.name ?? productId,
  );

  const getSuccessUrl = () => {
    if (successUrl) return successUrl;
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}`;
  };

  const onCheckout = async () => {
    isLoading = true;
    error = null;
    try {
      const checkoutProductId = productId;
      const { url } = await client.action(checkoutLinkRef, {
        productId: checkoutProductId,
        successUrl: getSuccessUrl(),
      });
      window.location.href = url;
    } catch (checkoutError) {
      error = checkoutError instanceof Error ? checkoutError.message : "Checkout failed";
    } finally {
      isLoading = false;
    }
  };
</script>

<Ark
  as="section"
  class={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
>
  <Ark as="h3" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
    {resolvedTitle}
  </Ark>
  <Ark as="p" class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
    {description ?? (type === "one-time" ? "Buy once and own it." : "Purchase any time.")}
  </Ark>

  {#if error}
    <Ark as="p" class="mt-2 text-sm text-red-600">{error}</Ark>
  {/if}

  <Ark as="div" class="mt-4 flex items-center gap-2">
    {#if type === "one-time" && owned}
      <Ark
        as="span"
        class="inline-flex rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700"
      >
        Owned
      </Ark>
    {:else}
      <CheckoutButton
        {productId}
        disabled={isLoading}
        onCheckout={onCheckout}
      >
        {type === "one-time" ? "Buy now" : "Purchase"}
      </CheckoutButton>
    {/if}
  </Ark>
</Ark>
