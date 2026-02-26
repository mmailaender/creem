<script lang="ts">
  import { setContext } from "svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import PricingSection from "../primitives/PricingSection.svelte";
  import PaymentWarningBanner from "../primitives/PaymentWarningBanner.svelte";
  import ScheduledChangeBanner from "../primitives/ScheduledChangeBanner.svelte";
  import CancelConfirmDialog from "../primitives/CancelConfirmDialog.svelte";
  import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";
  import type {
    BillingPermissions,
    ConnectedBillingApi,
    ConnectedBillingModel,
    SubscriptionPlanRegistration,
  } from "./types.js";
    import { SvelteSet } from "svelte/reactivity";

  interface Props {
    api: ConnectedBillingApi;
    permissions?: BillingPermissions;
    class?: string;
    successUrl?: string;
    units?: number;
    showSeatPicker?: boolean;
    children?: import("svelte").Snippet;
  }

  let {
    api,
    permissions = undefined,
    class: className = "",
    successUrl = undefined,
    units = undefined,
    showSeatPicker = false,
    children,
  }: Props = $props();

  const canCheckout = $derived(permissions?.canCheckout !== false);
  const canChange = $derived(permissions?.canChangeSubscription !== false);
  const canCancel = $derived(permissions?.canCancelSubscription !== false);
  const canResume = $derived(permissions?.canResumeSubscription !== false);
  const canUpdateSeats = $derived(permissions?.canUpdateSeats !== false);

  const client = useConvexClient();

  // svelte-ignore state_referenced_locally
  const {
    getBillingUiModel: billingUiModelRef,
    generateCheckoutLink: checkoutLinkRef,
    changeCurrentSubscription: changeSubRef,
    updateSubscriptionSeats: updateSeatsRef,
    cancelCurrentSubscription: cancelRef,
    resumeCurrentSubscription: resumeRef,
  } = api;

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

  const activePlanId = $derived.by<string | null>(() => {
    if (!model) return null;
    // Use this component's matched subscription product ID, not the global one
    const subProductId = localSubscriptionProductId;
    if (subProductId) {
      const matchedPlan = registeredPlans.find((plan) => {
        const values = Object.values(plan.productIds ?? {}).filter(Boolean) as string[];
        return values.includes(subProductId);
      });
      return matchedPlan?.planId ?? null;
    }
    // No active subscription — if user is signed in, treat the free plan as active
    if (model.user) {
      const freePlan = plans.find((p) => p.category === "free");
      if (freePlan) return freePlan.planId;
    }
    return null;
  });

  const allProducts = $derived(model?.allProducts ?? []);

  const plansFromRegistered = $derived.by<UIPlanEntry[]>(() => {
    return registeredPlans.map((plan) => {
      const productIds = plan.productIds ?? {};
      const firstProductId = Object.values(productIds)[0];
      const firstProduct = firstProductId
        ? allProducts.find((p) => p.id === firstProductId)
        : undefined;

      const cycleKeys = Object.keys(productIds).filter(
        (k): k is RecurringCycle => k !== "custom",
      );

      const entry: UIPlanEntry = {
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
        title: plan.title ?? firstProduct?.name ?? plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1),
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

  const plans = $derived(plansFromRegistered);

  // Collect all product IDs that belong to plans in THIS component instance.
  const ownProductIds = $derived.by<Set<string>>(() => {
    const ids = new SvelteSet<string>();
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

  const getFallbackSuccessUrl = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
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
        ...(successUrl ? { successUrl } : {}),
        fallbackSuccessUrl: getFallbackSuccessUrl(),
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
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  }) => {
    await startCheckout(payload.productId, payload.units);
  };

  const handleSwitchPlan = async (payload: {
    plan: UIPlanEntry;
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

</script>

<div class="hidden" aria-hidden="true">
  {@render children?.()}
</div>

<section class={`space-y-4 ${className}`}>
  {#if actionError}
    <div
      class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {actionError}
    </div>
  {/if}

  {#if !model}
    <p class="text-sm text-zinc-500">Loading billing model…</p>
  {:else}
    {#if isCancelInFlight && ownsActiveSubscription}
      <div
        class="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
      >
        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
        Processing cancellation…
      </div>
    {/if}

    {#if ownsActiveSubscription && snapshot}
      <ScheduledChangeBanner
        snapshot={{ ...snapshot, metadata: { ...snapshot.metadata, cancelAtPeriodEnd: localCancelAtPeriodEnd, currentPeriodEnd: localCurrentPeriodEnd } }}
        isLoading={isActionLoading}
        onResume={resumeRef && canResume ? resumeSubscription : undefined}
      />
    {/if}
    <PaymentWarningBanner snapshot={snapshot} />

    <PricingSection
      plans={plans}
      snapshot={snapshot ? { ...snapshot, activePlanId } : null}
      {selectedCycle}
      products={allProducts}
      subscriptionProductId={localSubscriptionProductId}
      subscriptionStatus={localSubscriptionState}
      subscriptionTrialEnd={matchedSubscription?.trialEnd ?? null}
      {units}
      {showSeatPicker}
      subscribedSeats={localSubscribedSeats}
      isGroupSubscribed={ownsActiveSubscription}
      onCycleChange={(cycle) => {
        selectedCycle = cycle;
      }}
      disableCheckout={!canCheckout}
      disableSwitch={!canChange}
      disableSeats={!canUpdateSeats}
      onCheckout={canCheckout ? handlePricingCheckout : undefined}
      onSwitchPlan={changeSubRef && canChange ? handleSwitchPlan : undefined}
      onUpdateSeats={updateSeatsRef && canUpdateSeats ? handleUpdateSeats : undefined}
    />

    <div class="flex flex-wrap items-center gap-3">
      {#if children}
        {@render children()}
      {/if}

      {#if cancelRef && ownsActiveSubscription && localSubscriptionState !== "scheduled_cancel" && localSubscriptionState !== "canceled"}
        <button
          type="button"
          class="text-sm text-red-600 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          disabled={isActionLoading || !canCancel}
          onclick={() => { cancelDialogOpen = true; }}
        >
          Cancel subscription
        </button>
      {/if}
    </div>

    <CancelConfirmDialog
      open={cancelDialogOpen}
      isLoading={isActionLoading}
      onOpenChange={(open) => { cancelDialogOpen = open; }}
      onConfirm={confirmCancelSubscription}
    />
  {/if}
</section>
