<script lang="ts">
  import { setContext } from "svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { Ark } from "@ark-ui/svelte/factory";
  import PricingSection from "../components/PricingSection.svelte";
  import PaymentWarningBanner from "../components/PaymentWarningBanner.svelte";
  import ScheduledChangeBanner from "../components/ScheduledChangeBanner.svelte";
  import TrialLimitBanner from "../components/TrialLimitBanner.svelte";
  import CustomerPortalButton from "../components/CustomerPortalButton.svelte";
  import CancelConfirmDialog from "../components/CancelConfirmDialog.svelte";
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
  const changeSubRef = api.changeCurrentSubscription;
  const updateSeatsRef = api.updateSubscriptionSeats;
  const cancelRef = api.cancelCurrentSubscription;
  const resumeRef = api.resumeCurrentSubscription;
  const syncProductsRef = api.syncProducts;
  const createDemoUserRef = api.createDemoUser;

  const billingModelQuery = useQuery(billingUiModelRef, {});

  let selectedCycle = $state<RecurringCycle>("every-month");
  let isActionLoading = $state(false);
  let isCancelInFlight = $state(false);
  let actionError = $state<string | null>(null);
  let registeredPlans = $state<SubscriptionPlanRegistration[]>([]);
  let cancelDialogOpen = $state(false);

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
    // Use this component's matched subscription product ID, not the global one
    const subProductId = localSubscriptionProductId;
    if (!subProductId) return null;

    const matchedPlan = registeredPlans.find((plan) => {
      const values = Object.values(plan.productIds ?? {}).filter(Boolean) as string[];
      return values.includes(subProductId);
    });
    return matchedPlan?.planId ?? null;
  });

  const allProducts = $derived(model?.allProducts ?? []);

  const plansFromRegistered = $derived.by<PlanCatalogEntry[]>(() => {
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
        displayName: plan.displayName ?? firstProduct?.name ?? plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1),
        description: plan.description ?? firstProduct?.description ?? undefined,
        contactUrl: plan.contactUrl,
        recommended: plan.recommended,
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

  // Auto-derive plans from the planCatalog when no <Subscription.Plan> children are registered.
  const plansFromCatalog = $derived.by<PlanCatalogEntry[]>(() => {
    const catalog = model?.planCatalog;
    if (!catalog?.plans) return [];
    return catalog.plans.map((p) => ({
      planId: p.planId,
      category: (p.category ?? "custom") as PlanCatalogEntry["category"],
      billingType: (p.billingType ?? "custom") as PlanCatalogEntry["billingType"],
      pricingModel: (p.pricingModel ?? "flat") as PlanCatalogEntry["pricingModel"],
      displayName: p.displayName,
      description: p.description,
      contactUrl: p.contactUrl,
      recommended: p.recommended,
      creemProductIds: p.creemProductIds,
      billingCycles: p.billingCycles as RecurringCycle[] | undefined,
    }));
  });

  // Explicit <Subscription.Plan> children take priority; otherwise auto-render from catalog
  const plans = $derived(
    plansFromRegistered.length > 0 ? plansFromRegistered : plansFromCatalog,
  );

  // Collect all product IDs that belong to plans in THIS component instance.
  const ownProductIds = $derived.by<Set<string>>(() => {
    const ids = new Set<string>();
    for (const plan of plans) {
      if (plan.creemProductIds) {
        for (const pid of Object.values(plan.creemProductIds)) {
          if (pid) ids.add(pid);
        }
      }
    }
    return ids;
  });

  // Find the subscription from activeSubscriptions that belongs to THIS component.
  const matchedSubscription = $derived.by(() => {
    const subs = model?.activeSubscriptions;
    if (!subs || ownProductIds.size === 0) return null;
    return subs.find((s) => ownProductIds.has(s.productId)) ?? null;
  });

  const ownsActiveSubscription = $derived(matchedSubscription != null);
  const localSubscriptionProductId = $derived(matchedSubscription?.productId ?? null);
  const localCancelAtPeriodEnd = $derived(matchedSubscription?.cancelAtPeriodEnd ?? false);
  const localCurrentPeriodEnd = $derived(matchedSubscription?.currentPeriodEnd ?? null);
  const localSubscriptionState = $derived(matchedSubscription?.status ?? null);
  const localSubscribedSeats = $derived(matchedSubscription?.seats ?? null);

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

  const getPreferredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const startCheckout = async (productId: string, checkoutUnits?: number) => {
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await client.action(checkoutLinkRef, {
        productId,
        successUrl: getSuccessUrl(),
        theme: getPreferredTheme(),
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

  const handleSwitchPlan = async (payload: {
    plan: PlanCatalogEntry;
    productId: string;
    units?: number;
  }) => {
    if (!changeSubRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      await client.action(changeSubRef, { productId: payload.productId });
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Switch failed";
    } finally {
      isActionLoading = false;
    }
  };

  const handleUpdateSeats = async (payload: { units: number }) => {
    if (!updateSeatsRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      await client.action(updateSeatsRef, { units: payload.units });
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Seat update failed";
    } finally {
      isActionLoading = false;
    }
  };

  const confirmCancelSubscription = async () => {
    if (!cancelRef) return;
    // Close dialog immediately for snappy UX
    cancelDialogOpen = false;
    isCancelInFlight = true;
    actionError = null;
    try {
      await client.action(cancelRef, {});
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Cancel failed";
    } finally {
      isCancelInFlight = false;
    }
  };

  const resumeSubscription = async () => {
    if (!resumeRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      await client.action(resumeRef, {});
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Resume failed";
    } finally {
      isActionLoading = false;
    }
  };

  const openPortal = async () => {
    if (!portalUrlRef) return;
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await client.action(portalUrlRef, {});
      window.open(url, "_blank", "noopener,noreferrer");
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

    {#if isCancelInFlight && ownsActiveSubscription}
      <Ark
        as="div"
        class="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
      >
        <Ark as="span" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Processing cancellation…
      </Ark>
    {/if}

    <TrialLimitBanner snapshot={snapshot} />
    {#if ownsActiveSubscription && snapshot}
      <ScheduledChangeBanner
        snapshot={{ ...snapshot, metadata: { ...snapshot.metadata, cancelAtPeriodEnd: localCancelAtPeriodEnd, currentPeriodEnd: localCurrentPeriodEnd } }}
        isLoading={isActionLoading}
        onResume={resumeRef ? resumeSubscription : undefined}
      />
    {/if}
    <PaymentWarningBanner snapshot={snapshot} />

    <PricingSection
      plans={plans}
      snapshot={snapshot ? { ...snapshot, activePlanId } : null}
      {selectedCycle}
      products={allProducts}
      subscriptionProductId={localSubscriptionProductId}
      {units}
      {showSeatPicker}
      subscribedSeats={localSubscribedSeats}
      isGroupSubscribed={ownsActiveSubscription}
      onCycleChange={(cycle) => {
        selectedCycle = cycle;
      }}
      onCheckout={handlePricingCheckout}
      onSwitchPlan={changeSubRef ? handleSwitchPlan : undefined}
      onUpdateSeats={updateSeatsRef ? handleUpdateSeats : undefined}
    />

    <Ark as="div" class="flex flex-wrap items-center gap-3">
      {#if showPortalButton && portalUrlRef && hasCreemCustomer}
        <CustomerPortalButton
          disabled={isActionLoading}
          onOpenPortal={openPortal}
        >
          Open billing portal
        </CustomerPortalButton>
      {/if}

      {#if cancelRef && ownsActiveSubscription && localSubscriptionState !== "scheduled_cancel" && localSubscriptionState !== "canceled"}
        <Ark
          as="button"
          type="button"
          class="text-sm text-red-600 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          disabled={isActionLoading}
          onclick={() => { cancelDialogOpen = true; }}
        >
          Cancel subscription
        </Ark>
      {/if}
    </Ark>

    <CancelConfirmDialog
      open={cancelDialogOpen}
      isLoading={isActionLoading}
      onOpenChange={(open) => { cancelDialogOpen = open; }}
      onConfirm={confirmCancelSubscription}
    />
  {/if}
</Ark>
