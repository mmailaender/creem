<script lang="ts">
  import { setContext } from "svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import CheckoutButton from "../primitives/CheckoutButton.svelte";
  import { formatPriceWithInterval } from "../primitives/shared.js";
  import {
    PRODUCT_GROUP_CONTEXT_KEY,
    type ProductGroupContextValue,
  } from "./productGroupContext.js";
  import type {
    BillingPermissions,
    ConnectedBillingApi,
    ConnectedBillingModel,
    ProductItemRegistration,
    Transition,
  } from "./types.js";
    import { SvelteSet } from "svelte/reactivity";
    import { renderMarkdown } from "../../core/markdown.js";

  interface Props {
    api: ConnectedBillingApi;
    permissions?: BillingPermissions;
    transition?: Transition[];
    className?: string;
    successUrl?: string;
    children?: import("svelte").Snippet;
  }

  let {
    api,
    permissions = undefined,
    transition = [],
    className = "",
    successUrl = undefined,
    children,
  }: Props = $props();

  const canCheckout = $derived(permissions?.canCheckout !== false);

  const client = useConvexClient();

  // svelte-ignore state_referenced_locally
  const { getBillingUiModel: billingUiModelRef, generateCheckoutLink: checkoutLinkRef } = api;

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
  const rawOwnedProductIds = $derived(model?.ownedProductIds ?? []);

  // Resolve effective ownership by applying transition rules.
  // If the user purchased a "via_product" (upgrade delta), they effectively
  // own the transition target ('to') and no longer just the source ('from').
  const effectiveOwnedProductIds = $derived.by<string[]>(() => {
    const effective = new SvelteSet(rawOwnedProductIds);
    for (const rule of transition) {
      if (rule.kind === "via_product" && effective.has(rule.viaProductId)) {
        effective.add(rule.to);
        effective.delete(rule.from);
      }
    }
    return [...effective];
  });

  const activeOwnedProductId = $derived(
    registeredItems.find((item) => effectiveOwnedProductIds.includes(item.productId))?.productId ?? null,
  );

  // Determine if a product is a lower tier than the target by traversing the
  // transition graph (from → to edges). Returns true if there is a path from
  // `productId` to `targetId`, meaning `productId` is a lower tier.
  const isLowerTierThan = (productId: string, targetId: string): boolean => {
    const visited = new SvelteSet<string>();
    const queue = [productId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const rule of transition) {
        if (rule.from === current) {
          if (rule.to === targetId) return true;
          queue.push(rule.to);
        }
      }
    }
    return false;
  };

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

<section class={`space-y-3 ${className}`}>
  {#if error}
    <p class="text-sm text-red-600">{error}</p>
  {/if}

  <div class="flex flex-wrap items-center gap-3">
    {#each registeredItems as item (item.productId)}
      {@const isOwned = effectiveOwnedProductIds.includes(item.productId)}
      {@const isIncluded = !isOwned && activeOwnedProductId != null && isLowerTierThan(item.productId, activeOwnedProductId)}
      {@const checkoutProductId = resolveCheckoutProductId(item.productId)}
      {@const matchedProduct = allProducts.find((p) => p.id === item.productId)}
      {@const resolvedTitle = item.title ?? matchedProduct?.name ?? item.productId}
      {@const resolvedDescription = item.description ?? matchedProduct?.description}
      {@const resolvedPrice = formatPriceWithInterval(item.productId, allProducts)}
      {@const resolvedImageUrl = matchedProduct?.imageUrl ?? null}
      <article
        class={`max-w-sm rounded-xl border p-4 shadow-sm ${isIncluded ? "border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900" : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"}`}
      >
        {#if resolvedImageUrl}
          <img
            src={resolvedImageUrl}
            alt={resolvedTitle}
            class="mb-4 aspect-video w-full rounded-lg object-cover"
          />
        {/if}

        <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {resolvedTitle}
        </h3>

        {#if resolvedPrice}
          <p class={`mt-2 text-2xl font-bold ${isIncluded ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
            {resolvedPrice}
          </p>
        {/if}

        <div class="mt-4">
          {#if isOwned}
            <span
              class="inline-flex rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700"
            >
              Owned
            </span>
          {:else if isIncluded}
            <span
              class="inline-flex rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              Included
            </span>
          {:else if checkoutProductId}
            <CheckoutButton
              productId={checkoutProductId}
              disabled={isLoading || !canCheckout}
              onCheckout={() => startCheckout(checkoutProductId)}
            >
              {activeOwnedProductId ? "Upgrade" : "Buy now"}
            </CheckoutButton>
          {:else}
            <CheckoutButton
              productId={item.productId}
              disabled={isLoading || !canCheckout}
              onCheckout={() => startCheckout(item.productId)}
            >
              Buy now
            </CheckoutButton>
          {/if}
        </div>

        {#if resolvedDescription}
          <div class="creem-prose mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            <!-- eslint-disable-next-line svelte/no-at-html-tags — merchant-authored markdown from Creem -->
            {@html renderMarkdown(resolvedDescription)}
          </div>
        {/if}
      </article>
    {/each}
  </div>
</section>
