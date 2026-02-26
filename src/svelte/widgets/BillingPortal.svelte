<script lang="ts">
  import { useConvexClient, useQuery } from "convex-svelte";
  import CustomerPortalButton from "../primitives/CustomerPortalButton.svelte";
  import type { ConnectedBillingApi, ConnectedBillingModel } from "./types.js";
  import type { Snippet } from "svelte";

  interface Props {
    api: ConnectedBillingApi;
    className?: string;
    children?: Snippet;
  }

  let { api, className = "", children }: Props = $props();

  const client = useConvexClient();

  // svelte-ignore state_referenced_locally
  const { getBillingUiModel: billingUiModelRef, generateCustomerPortalUrl: portalUrlRef } = api;

  const billingModelQuery = useQuery(billingUiModelRef, {});
  const model = $derived(billingModelQuery.data as ConnectedBillingModel | undefined);
  const hasCreemCustomer = $derived(model?.hasCreemCustomer ?? false);

  let isLoading = $state(false);

  const openPortal = async () => {
    if (!portalUrlRef) return;
    isLoading = true;
    try {
      const { url } = await client.action(portalUrlRef, {});
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      isLoading = false;
    }
  };
</script>

{#if portalUrlRef && hasCreemCustomer}
  <CustomerPortalButton
    disabled={isLoading}
    onOpenPortal={openPortal}
    {className}
  >
    {#if children}
      {@render children()}
    {:else}
      Manage billing
    {/if}
  </CustomerPortalButton>
{/if}
