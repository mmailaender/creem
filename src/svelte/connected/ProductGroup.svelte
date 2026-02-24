<script lang="ts">
  import { setContext } from "svelte";
  import { Ark } from "@ark-ui/svelte/factory";
  import { useConvexClient, useQuery } from "convex-svelte";
  import CheckoutButton from "../components/CheckoutButton.svelte";
  import {
    PRODUCT_GROUP_CONTEXT_KEY,
    type ProductGroupContextValue,
  } from "./productGroupContext.js";
  import type {
    ConnectedBillingApi,
    ConnectedBillingModel,
    ProductItemRegistration,
    Transition,
  } from "./types.js";

  interface Props {
    api: ConnectedBillingApi;
    transition?: Transition[];
    className?: string;
    successUrl?: string;
    children?: import("svelte").Snippet;
  }

  let {
    api,
    transition = [],
    className = "",
    successUrl = undefined,
    children,
  }: Props = $props();

  const client = useConvexClient();

  // Capture static function references (these never change at runtime)
  const billingUiModelRef = api.getBillingUiModel;
  const checkoutLinkRef = api.generateCheckoutLink;

  const billingModelQuery = useQuery(billingUiModelRef, {});

  let registeredItems = $state<ProductItemRegistration[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const contextValue: ProductGroupContextValue = {
    registerItem: (item) => {
      registeredItems = [
        ...registeredItems.filter((candidate) => candidate.productId !== item.productId),
        item,
      ];
      return () => {
        registeredItems = registeredItems.filter(
          (candidate) => candidate.productId !== item.productId,
        );
      };
    },
  };

  setContext(PRODUCT_GROUP_CONTEXT_KEY, contextValue);

  const model = $derived((billingModelQuery.data ?? null) as ConnectedBillingModel | null);
  const allProducts = $derived(model?.allProducts ?? []);
  const ownedProductIds = $derived(model?.ownedProductIds ?? []);
  const activeOwnedProductId = $derived(
    registeredItems.find((item) => ownedProductIds.includes(item.productId))?.productId ?? null,
  );

  const resolveTransitionTarget = (fromProductId: string, toProductId: string) =>
    transition.find(
      (rule) => rule.from === fromProductId && rule.to === toProductId,
    );

  const resolveCheckoutProductId = (toProductId: string) => {
    if (!activeOwnedProductId) {
      return toProductId;
    }
    const rule = resolveTransitionTarget(activeOwnedProductId, toProductId);
    if (!rule) {
      return null;
    }
    if (rule.kind === "via_product") {
      return rule.viaProductId;
    }
    return toProductId;
  };

  const getSuccessUrl = () => {
    if (successUrl) return successUrl;
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}`;
  };

  const getPreferredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const startCheckout = async (checkoutProductId: string) => {
    isLoading = true;
    error = null;
    try {
      const { url } = await client.action(checkoutLinkRef, {
        productId: checkoutProductId,
        successUrl: getSuccessUrl(),
        theme: getPreferredTheme(),
      });
      window.location.href = url;
    } catch (checkoutError) {
      error = checkoutError instanceof Error ? checkoutError.message : "Checkout failed";
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="hidden" aria-hidden="true">
  {@render children?.()}
</div>

<Ark as="section" class={`space-y-3 ${className}`}>
  {#if error}
    <Ark as="p" class="text-sm text-red-600">{error}</Ark>
  {/if}

  <Ark as="div" class="grid gap-4 md:grid-cols-2">
    {#each registeredItems as item (item.productId)}
      {@const isOwned = ownedProductIds.includes(item.productId)}
      {@const checkoutProductId = resolveCheckoutProductId(item.productId)}
      {@const matchedProduct = allProducts.find((p) => p.id === item.productId)}
      {@const resolvedTitle = item.title ?? matchedProduct?.name ?? item.productId}
      {@const resolvedDescription = item.description ?? matchedProduct?.description}
      <Ark
        as="article"
        class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <Ark as="h3" class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {resolvedTitle}
        </Ark>
        {#if resolvedDescription}
          <Ark as="p" class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {resolvedDescription}
          </Ark>
        {/if}

        <Ark as="div" class="mt-4">
          {#if isOwned}
            <Ark
              as="span"
              class="inline-flex rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700"
            >
              Owned
            </Ark>
          {:else if checkoutProductId}
            <CheckoutButton
              productId={checkoutProductId}
              disabled={isLoading}
              onCheckout={() => startCheckout(checkoutProductId)}
            >
              {activeOwnedProductId ? "Upgrade" : "Buy now"}
            </CheckoutButton>
          {:else}
            <Ark as="span" class="text-sm text-zinc-500">No upgrade path available.</Ark>
          {/if}
        </Ark>
      </Ark>
    {/each}
  </Ark>
</Ark>
