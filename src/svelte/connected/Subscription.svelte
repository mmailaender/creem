<script lang="ts">
  import { setContext } from "svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { Ark } from "@ark-ui/svelte/factory";
  import PricingSection from "../components/PricingSection.svelte";
  import PaymentWarningBanner from "../components/PaymentWarningBanner.svelte";
  import ScheduledChangeBanner from "../components/ScheduledChangeBanner.svelte";
  import TrialLimitBanner from "../components/TrialLimitBanner.svelte";
  import CustomerPortalButton from "../components/CustomerPortalButton.svelte";
  import type { PlanCatalogEntry, RecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";
  import type {
    ConnectedBillingApi,
    ConnectedBillingModel,
    SubscriptionPlanRegistration,
  } from "./types.js";

  interface Props {
    api: ConnectedBillingApi;
    className?: string;
    successUrl?: string;
    showPortalButton?: boolean;
    units?: number;
    showSeatPicker?: boolean;
    children?: import("svelte").Snippet;
  }

  let {
    api,
    className = "",
    successUrl = undefined,
    showPortalButton = true,
    units = undefined,
    showSeatPicker = false,
    children,
  }: Props = $props();

  const client = useConvexClient();

  // Capture static function references (these never change at runtime)
  const billingUiModelRef = api.getBillingUiModel;
  const checkoutLinkRef = api.generateCheckoutLink;
  const portalUrlRef = api.generateCustomerPortalUrl;
  const syncProductsRef = api.syncProducts;
  const createDemoUserRef = api.createDemoUser;

  const billingModelQuery = useQuery(billingUiModelRef, {});

  let selectedCycle = $state<RecurringCycle>("every-month");
  let isActionLoading = $state(false);
  let actionError = $state<string | null>(null);
  let registeredPlans = $state<SubscriptionPlanRegistration[]>([]);

  const contextValue: SubscriptionContextValue = {
    registerPlan: (plan) => {
      registeredPlans = [
        ...registeredPlans.filter((candidate) => candidate.planId !== plan.planId),
        plan,
      ];
      return () => {
        registeredPlans = registeredPlans.filter(
          (candidate) => candidate.planId !== plan.planId,
        );
      };
    },
  };

  setContext(SUBSCRIPTION_CONTEXT_KEY, contextValue);

  const model = $derived((billingModelQuery.data ?? null) as ConnectedBillingModel | null);
  const snapshot = $derived(model?.billingSnapshot ?? null);
  const hasCreemCustomer = $derived(model?.hasCreemCustomer ?? false);

  const activePlanId = $derived.by<string | null>(() => {
    if (!model) return null;
    if (snapshot?.activePlanId) {
      return snapshot.activePlanId;
    }
    const subscriptionProductId = model.subscriptionProductId;
    if (!subscriptionProductId) return null;

    const matchedPlan = registeredPlans.find((plan) => {
      const values = Object.values(plan.productIds ?? {}).filter(Boolean) as string[];
      return values.includes(subscriptionProductId);
    });
    return matchedPlan?.planId ?? null;
  });

  const allProducts = $derived(model?.allProducts ?? []);

  const plans = $derived.by<PlanCatalogEntry[]>(() => {
    return registeredPlans.map((plan) => {
      const productIds = plan.productIds ?? {};
      const firstProductId = Object.values(productIds)[0];
      const firstProduct = firstProductId
        ? allProducts.find((p) => p.id === firstProductId)
        : undefined;

      const cycleKeys = Object.keys(productIds).filter(
        (k): k is RecurringCycle => k !== "custom",
      );

      const entry: PlanCatalogEntry = {
        planId: plan.planId,
        category:
          plan.type === "free"
            ? "free"
            : plan.type === "enterprise"
              ? "enterprise"
              : "paid",
        billingType:
          plan.type === "free" || plan.type === "enterprise" ? "custom" : "recurring",
        pricingModel: plan.type === "seat-based" ? "seat" : "flat",
        displayName: plan.displayName ?? firstProduct?.name ?? plan.planId,
        description: plan.description ?? firstProduct?.description,
        contactUrl: plan.contactUrl,
        creemProductIds:
          Object.keys(productIds).length > 0
            ? (productIds as Record<string, string>)
            : undefined,
      };
      if (cycleKeys.length > 0) {
        entry.billingCycles = cycleKeys;
      }
      return entry;
    });
  });

  const hasMissingProducts = $derived.by(() => {
    if (!model) return false;
    const configured = Object.values(model.configuredProducts ?? {});
    return configured.length > 0 && configured.every((product) => product == null);
  });

  const getSuccessUrl = () => {
    if (successUrl) return successUrl;
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}`;
  };

  const startCheckout = async (productId: string, checkoutUnits?: number) => {
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await client.action(checkoutLinkRef, {
        productId,
        successUrl: getSuccessUrl(),
        ...(checkoutUnits != null ? { units: checkoutUnits } : {}),
      });
      window.location.href = url;
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Checkout failed";
    } finally {
      isActionLoading = false;
    }
  };

  const handlePricingCheckout = async (payload: {
    plan: PlanCatalogEntry;
    productId: string;
    units?: number;
  }) => {
    await startCheckout(payload.productId, payload.units);
  };

  const openPortal = async () => {
    if (!portalUrlRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await client.action(portalUrlRef, {});
      window.location.href = url;
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Portal failed";
    } finally {
      isActionLoading = false;
    }
  };

  const syncProducts = async () => {
    if (!syncProductsRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      await client.action(syncProductsRef, {});
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Product sync failed";
    } finally {
      isActionLoading = false;
    }
  };

  const createDemoUser = async () => {
    if (!createDemoUserRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      await client.mutation(createDemoUserRef, {});
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Could not create demo user";
    } finally {
      isActionLoading = false;
    }
  };
</script>

<div class="hidden" aria-hidden="true">
  {@render children?.()}
</div>

<Ark as="section" class={`space-y-4 ${className}`}>
  {#if actionError}
    <Ark
      as="div"
      class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {actionError}
    </Ark>
  {/if}

  {#if !model}
    <Ark as="p" class="text-sm text-zinc-500">Loading billing model…</Ark>
  {:else}
    {#if !model.user && createDemoUserRef}
      <Ark as="div" class="flex items-center gap-3 rounded-lg border px-3 py-2">
        <Ark as="p" class="text-sm text-zinc-600">No demo user found yet.</Ark>
        <Ark
          as="button"
          type="button"
          class="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          disabled={isActionLoading}
          onclick={createDemoUser}
        >
          Create demo user
        </Ark>
      </Ark>
    {/if}

    {#if hasMissingProducts && syncProductsRef}
      <Ark as="div" class="flex items-center gap-3 rounded-lg border px-3 py-2">
        <Ark as="p" class="text-sm text-zinc-600">
          Products are not synced to Convex yet.
        </Ark>
        <Ark
          as="button"
          type="button"
          class="rounded-md cursor-pointer border px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          disabled={isActionLoading}
          onclick={syncProducts}
        >
          Sync products
        </Ark>
      </Ark>
    {/if}

    <TrialLimitBanner snapshot={snapshot} />
    <ScheduledChangeBanner snapshot={snapshot} />
    <PaymentWarningBanner snapshot={snapshot} />

    <PricingSection
      plans={plans}
      snapshot={snapshot ? { ...snapshot, activePlanId } : null}
      {selectedCycle}
      {units}
      {showSeatPicker}
      onCycleChange={(cycle) => {
        selectedCycle = cycle;
      }}
      onCheckout={handlePricingCheckout}
    />

    {#if showPortalButton && portalUrlRef && hasCreemCustomer}
      <CustomerPortalButton
        disabled={isActionLoading}
        onOpenPortal={openPortal}
      >
        Open billing portal
      </CustomerPortalButton>
    {/if}
  {/if}
</Ark>
