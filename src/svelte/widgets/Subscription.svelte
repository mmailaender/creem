<script lang="ts">
  import { getContext, untrack } from "svelte";
  import { useConvexClient, useQuery } from "convex-svelte";
  import PricingCard from "../primitives/PricingCard.svelte";
  import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";
  import type {
    ConnectedBillingApi,
    ConnectedBillingModel,
    SubscriptionPlanType,
  } from "./types.js";

  interface Props {
    api?: ConnectedBillingApi;
    planId?: string;
    type: SubscriptionPlanType;
    title?: string;
    description?: string;
    contactUrl?: string;
    recommended?: boolean;
    productIds?: Partial<Record<RecurringCycle, string>>;
    className?: string;
    successUrl?: string;
    units?: number;
    showSeatPicker?: boolean;
  }

  let {
    api = undefined,
    planId = undefined,
    type,
    title = undefined,
    description = undefined,
    contactUrl = undefined,
    recommended = undefined,
    productIds = undefined,
    className = "",
    successUrl = undefined,
    units = undefined,
    showSeatPicker = false,
  }: Props = $props();

  // ── Context detection: grouped (item) vs standalone ──────────────────
  const groupContext = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );
  const isGrouped = groupContext != null;

  // ── Grouped mode: register with the parent Subscription.Group ────────
  if (isGrouped) {
    $effect(() => {
      const resolvedPlanId = planId ?? Object.values(productIds ?? {})[0] ?? type;
      const registration = {
        planId: resolvedPlanId,
        type,
        title,
        description,
        contactUrl,
        recommended,
        productIds,
      };
      const unregister = untrack(() => groupContext.registerPlan(registration));
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
      changeSub: api.changeCurrentSubscription ?? undefined,
      updateSeats: api.updateSubscriptionSeats ?? undefined,
    };
    const q = useQuery(refs.billingUiModel, {});
    return { client: c, refs, query: q };
  }

  const standalone = !isGrouped ? initStandalone() : undefined;

  let selectedCycle = $state<RecurringCycle>("every-month");
  let isActionLoading = $state(false);
  let actionError = $state<string | null>(null);

  const model = $derived(
    (standalone?.query?.data ?? null) as ConnectedBillingModel | null,
  );
  const allProducts = $derived(model?.allProducts ?? []);

  // Build a single UIPlanEntry from this component's props
  const plan = $derived.by<UIPlanEntry | null>(() => {
    if (isGrouped) return null;
    const pids = productIds ?? {};
    const firstProductId = Object.values(pids)[0];
    const firstProduct = firstProductId
      ? allProducts.find((p) => p.id === firstProductId)
      : undefined;

    const cycleKeys = Object.keys(pids).filter(
      (k): k is RecurringCycle => k !== "custom",
    );

    const resolvedPlanId = planId ?? firstProductId ?? type;

    const entry: UIPlanEntry = {
      planId: resolvedPlanId,
      category:
        type === "free"
          ? "free"
          : type === "enterprise"
            ? "enterprise"
            : "paid",
      billingType:
        type === "free" || type === "enterprise" ? "custom" : "recurring",
      pricingModel: type === "seat-based" ? "seat" : "flat",
      title:
        title ??
        firstProduct?.name ??
        resolvedPlanId.charAt(0).toUpperCase() + resolvedPlanId.slice(1),
      description: description ?? firstProduct?.description ?? undefined,
      contactUrl,
      recommended,
      creemProductIds:
        Object.keys(pids).length > 0
          ? (pids as Record<string, string>)
          : undefined,
    };
    if (cycleKeys.length > 0) {
      entry.billingCycles = cycleKeys;
    }
    return entry;
  });

  // Determine if the user already subscribes to a product in this plan
  const ownProductIds = $derived.by<Set<string>>(() => {
    if (!plan?.creemProductIds) return new Set();
    return new Set(Object.values(plan.creemProductIds).filter(Boolean) as string[]);
  });

  const matchedSubscription = $derived.by(() => {
    const subs = model?.activeSubscriptions;
    if (!subs || ownProductIds.size === 0) return null;
    return subs.find((s) => ownProductIds.has(s.productId)) ?? null;
  });

  const activePlanId = $derived(matchedSubscription ? (plan?.planId ?? null) : null);
  const localSubscriptionProductId = $derived(matchedSubscription?.productId ?? null);
  const localSubscribedSeats = $derived(matchedSubscription?.seats ?? null);
  const ownsActiveSubscription = $derived(matchedSubscription != null);

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

  const handleCheckout = async (payload: {
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  }) => {
    if (!standalone) return;
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await standalone.client.action(standalone.refs.checkoutLink, {
        productId: payload.productId,
        successUrl: getSuccessUrl(),
        theme: getPreferredTheme(),
        ...(payload.units != null ? { units: payload.units } : {}),
      });
      window.location.href = url;
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Checkout failed";
    } finally {
      isActionLoading = false;
    }
  };

  const handleSwitchPlan = async (payload: {
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  }) => {
    if (!standalone?.refs.changeSub) return;
    isActionLoading = true;
    actionError = null;
    try {
      await standalone.client.action(standalone.refs.changeSub, { productId: payload.productId });
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Switch failed";
    } finally {
      isActionLoading = false;
    }
  };

  const handleUpdateSeats = async (payload: { units: number }) => {
    if (!standalone?.refs.updateSeats) return;
    isActionLoading = true;
    actionError = null;
    try {
      await standalone.client.action(standalone.refs.updateSeats, { units: payload.units });
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Seat update failed";
    } finally {
      isActionLoading = false;
    }
  };
</script>

<!-- Grouped mode: render nothing (registration only) -->
{#if !isGrouped && plan}
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
    <PricingCard
      {plan}
      {selectedCycle}
      {activePlanId}
      products={allProducts}
      subscriptionProductId={localSubscriptionProductId}
      {units}
      {showSeatPicker}
      subscribedSeats={localSubscribedSeats}
      isGroupSubscribed={ownsActiveSubscription}
      onCheckout={handleCheckout}
      onSwitchPlan={standalone?.refs.changeSub ? handleSwitchPlan : undefined}
      onUpdateSeats={standalone?.refs.updateSeats ? handleUpdateSeats : undefined}
    />
  {/if}
</section>
{/if}
