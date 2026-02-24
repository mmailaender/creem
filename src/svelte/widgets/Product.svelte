<script lang="ts">
  import { getContext, untrack } from "svelte";
  import { Ark } from "@ark-ui/svelte/factory";
  import { useConvexClient, useQuery } from "convex-svelte";
  import CheckoutButton from "../primitives/CheckoutButton.svelte";
  import { formatPriceWithInterval } from "../primitives/shared.js";
  import {
    PRODUCT_GROUP_CONTEXT_KEY,
    type ProductGroupContextValue,
  } from "./productGroupContext.js";
  import type { ConnectedBillingApi, ConnectedBillingModel, ProductType } from "./types.js";

  interface Props {
    api?: ConnectedBillingApi;
    productId: string;
    type: ProductType;
    title?: string;
    description?: string;
    className?: string;
    successUrl?: string;
  }

  let {
    api = undefined,
    productId,
    type,
    title = undefined,
    description = undefined,
    className = "",
    successUrl = undefined,
  }: Props = $props();

  // ── Context detection: grouped (item) vs standalone ──────────────────
  const groupContext = getContext<ProductGroupContextValue | undefined>(
    PRODUCT_GROUP_CONTEXT_KEY,
  );
  const isGrouped = groupContext != null;

  // ── Grouped mode: register with the parent Product.Group ─────────────
  if (isGrouped) {
    $effect(() => {
      const registration = { productId, type, title, description };
      const unregister = untrack(() => groupContext.registerItem(registration));
      return () => untrack(unregister);
    });
  }

  // ── Standalone mode: fetch data and handle checkout ──────────────────
  // Guard in a function so Svelte's reactive prop system doesn't eagerly
  // resolve api.* member accesses when api is undefined (grouped mode).
  function initStandalone() {
    if (!api) return undefined;
    const c = useConvexClient();
    const refs = {
      billingUiModel: api.getBillingUiModel,
      checkoutLink: api.generateCheckoutLink,
    };
    const q = useQuery(refs.billingUiModel, {});
    return { client: c, refs, query: q };
  }

  const standalone = !isGrouped ? initStandalone() : undefined;

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const model = $derived(
    (standalone?.query?.data ?? null) as ConnectedBillingModel | null,
  );
  const owned = $derived(model?.ownedProductIds?.includes(productId) ?? false);
  const matchedProduct = $derived(
    model?.allProducts.find((product) => product.id === productId),
  );
  const resolvedTitle = $derived(title ?? matchedProduct?.name ?? productId);
  const resolvedDescription = $derived(
    description ??
      matchedProduct?.description ??
      (type === "one-time" ? "Buy once and own it." : "Purchase any time."),
  );
  const resolvedPrice = $derived(
    formatPriceWithInterval(productId, model?.allProducts ?? []),
  );

  const getSuccessUrl = () => {
    if (successUrl) return successUrl;
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}`;
  };

  const getPreferredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const onCheckout = async () => {
    if (!standalone) return;
    isLoading = true;
    error = null;
    try {
      const { url } = await standalone.client.action(standalone.refs.checkoutLink, {
        productId,
        successUrl: getSuccessUrl(),
        theme: getPreferredTheme(),
      });
      window.location.href = url;
    } catch (checkoutError) {
      error =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout failed";
    } finally {
      isLoading = false;
    }
  };
</script>

<!-- Grouped mode: render nothing (registration only) -->
{#if !isGrouped}
<Ark
  as="section"
  class={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
>
  <Ark as="h3" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
    {resolvedTitle}
  </Ark>
  <Ark as="p" class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
    {resolvedDescription}
  </Ark>

  {#if resolvedPrice}
    <Ark as="p" class="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
      {resolvedPrice}
    </Ark>
  {/if}

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
{/if}
