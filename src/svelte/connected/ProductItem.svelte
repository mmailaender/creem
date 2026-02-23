<script lang="ts">
  import { getContext, untrack } from "svelte";
  import {
    PRODUCT_GROUP_CONTEXT_KEY,
    type ProductGroupContextValue,
  } from "./productGroupContext.js";
  import type { ProductType } from "./types.js";

  interface Props {
    productId: string;
    type: ProductType;
    title?: string;
    description?: string;
  }

  let {
    productId,
    type,
    title = undefined,
    description = undefined,
  }: Props = $props();

  const context = getContext<ProductGroupContextValue | undefined>(
    PRODUCT_GROUP_CONTEXT_KEY,
  );

  if (!context) {
    throw new Error("Product.Item must be used inside <Product.Group>.");
  }

  $effect(() => {
    const registration = { productId, type, title, description };
    const unregister = untrack(() => context.registerItem(registration));
    return () => untrack(unregister);
  });
</script>
