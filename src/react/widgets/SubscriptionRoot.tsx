import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";
import { useQuery, useConvex } from "convex/react";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";

import { PricingSection } from "../primitives/PricingSection.js";
import { PaymentWarningBanner } from "../primitives/PaymentWarningBanner.js";
import { ScheduledChangeBanner } from "../primitives/ScheduledChangeBanner.js";

import { SubscriptionContext } from "./subscriptionContext.js";
import { pendingCheckout } from "../../core/pendingCheckout.js";

import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
import type {
  BillingPermissions,
  CheckoutIntent,
  ConnectedBillingApi,
  ConnectedBillingModel,
  SubscriptionPlanRegistration,
} from "./types.js";

export const SubscriptionRoot = ({
  api,
  permissions,
  className = "",
  successUrl,
  units,
  showSeatPicker = false,
  twoColumnLayout = false,
  updateBehavior = "proration-charge-immediately",
  onBeforeCheckout,
  children,
}: PropsWithChildren<{
  api: ConnectedBillingApi;
  permissions?: BillingPermissions;
  class?: string;
  className?: string;
  successUrl?: string;
  units?: number;
  showSeatPicker?: boolean;
  twoColumnLayout?: boolean;
  updateBehavior?:
    | "proration-charge-immediately"
    | "proration-charge"
    | "proration-none";
  onBeforeCheckout?: (intent: CheckoutIntent) => Promise<boolean> | boolean;
}>) => {
  const canChange = permissions?.canChangeSubscription !== false;
  const canCancel = permissions?.canCancelSubscription !== false;
  const canResume = permissions?.canResumeSubscription !== false;

  const client = useConvex();

  const billingUiModelRef = api.uiModel;
  const checkoutLinkRef = api.checkouts.create;
  const updateRef = api.subscriptions?.update;
  const cancelRef = api.subscriptions?.cancel;
  const resumeRef = api.subscriptions?.resume;

  const modelRaw = useQuery(billingUiModelRef, {});
  const model = (modelRaw ?? null) as ConnectedBillingModel | null;

  const [selectedCycle, setSelectedCycle] =
    useState<RecurringCycle>("every-month");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [switchPlanDialogOpen, setSwitchPlanDialogOpen] = useState(false);
  const [pendingSwitchPlan, setPendingSwitchPlan] = useState<{
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [registeredPlans, setRegisteredPlans] = useState<
    SubscriptionPlanRegistration[]
  >([]);

  const contextValue = useMemo(
    () => ({
      registerPlan: (plan: SubscriptionPlanRegistration) => {
        setRegisteredPlans((prev) => [
          ...prev.filter((c) => c.planId !== plan.planId),
          plan,
        ]);
        return () => {
          setRegisteredPlans((prev) =>
            prev.filter((c) => c.planId !== plan.planId),
          );
        };
      },
    }),
    [],
  );

  const allProducts = useMemo(() => model?.allProducts ?? [], [model?.allProducts]);

  const plans = useMemo<UIPlanEntry[]>(() => {
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
          plan.type === "free" || plan.type === "enterprise"
            ? "custom"
            : "recurring",
        pricingModel: plan.type === "seat-based" ? "seat" : "flat",
        title:
          plan.title ??
          firstProduct?.name ??
          plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1),
        description:
          plan.description ?? firstProduct?.description ?? undefined,
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
  }, [registeredPlans, allProducts]);

  // Collect all product IDs that belong to plans in THIS component instance
  const ownProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const plan of plans) {
      if (plan.creemProductIds) {
        for (const pid of Object.values(plan.creemProductIds)) {
          if (pid) ids.add(pid);
        }
      }
    }
    return ids;
  }, [plans]);

  // Find the subscription from activeSubscriptions that belongs to THIS component
  const matchedSubscription = useMemo(() => {
    const subs = model?.activeSubscriptions;
    if (!subs || ownProductIds.size === 0) return null;
    return subs.find((s) => ownProductIds.has(s.productId)) ?? null;
  }, [model?.activeSubscriptions, ownProductIds]);

  const ownsActiveSubscription = matchedSubscription != null;
  const localSubscriptionProductId =
    matchedSubscription?.productId ?? null;
  const localCancelAtPeriodEnd =
    matchedSubscription?.cancelAtPeriodEnd ?? false;
  const localCurrentPeriodEnd =
    matchedSubscription?.currentPeriodEnd ?? null;
  const localSubscriptionState = matchedSubscription?.status ?? null;
  const localSubscribedSeats = matchedSubscription?.seats ?? null;

  const snapshot = model?.billingSnapshot ?? null;

  const canCheckout =
    !model?.user && onBeforeCheckout != null
      ? true
      : permissions?.canCheckout !== false;

  const canUpdateSeats =
    !model?.user && onBeforeCheckout != null
      ? true
      : permissions?.canUpdateSeats !== false;

  const activePlanId = useMemo(() => {
    if (!model) return null;
    const subProductId = localSubscriptionProductId;
    if (subProductId) {
      const matchedPlan = registeredPlans.find((plan) => {
        const values = Object.values(plan.productIds ?? {}).filter(
          Boolean,
        ) as string[];
        return values.includes(subProductId);
      });
      return matchedPlan?.planId ?? null;
    }
    if (model.user) {
      const freePlan = plans.find((p) => p.category === "free");
      if (freePlan) return freePlan.planId;
    }
    return null;
  }, [model, localSubscriptionProductId, registeredPlans, plans]);

  // Pending checkout resume after auth
  const pendingCheckoutHandled = useRef(false);
  useEffect(() => {
    if (!model?.user || pendingCheckoutHandled.current) return;
    pendingCheckoutHandled.current = true;
    const pending = pendingCheckout.load();
    if (!pending) return;
    if ((model.activeSubscriptions ?? []).length > 0) {
      pendingCheckout.clear();
      return;
    }
    startCheckout(pending.productId, pending.units);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.user]);

  const getFallbackSuccessUrl = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}${window.location.pathname}`;
  };

  const getPreferredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const startCheckout = useCallback(
    async (productId: string, checkoutUnits?: number) => {
      if (onBeforeCheckout) {
        const proceed = await onBeforeCheckout({
          productId,
          units: checkoutUnits,
        });
        if (!proceed) return;
      }
      setIsActionLoading(true);
      setActionError(null);
      try {
        console.log("[creem] startCheckout: calling action", { productId, checkoutUnits });
        const { url } = await client.action(checkoutLinkRef, {
          productId,
          ...(successUrl ? { successUrl } : {}),
          fallbackSuccessUrl: getFallbackSuccessUrl(),
          theme: getPreferredTheme(),
          ...(checkoutUnits != null ? { units: checkoutUnits } : {}),
        });
        console.log("[creem] startCheckout: got url", url);
        // Suppress Convex client's beforeunload dialog during checkout redirect.
        // Convex registers via addEventListener, so onbeforeunload=null has no effect.
        // A capture-phase listener fires before non-capture listeners on the same target
        // in modern browsers, and stopImmediatePropagation() blocks all subsequent handlers.
        window.addEventListener(
          "beforeunload",
          (e) => {
            e.stopImmediatePropagation();
          },
          { capture: true, once: true },
        );
        window.location.href = url;
        window.location.href = url;
      } catch (error) {
        console.error("[creem] startCheckout: error", error);
        setActionError(
          error instanceof Error ? error.message : "Checkout failed",
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [client, checkoutLinkRef, successUrl, onBeforeCheckout],
  );

  const handlePricingCheckout = useCallback(
    async (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => {
      await startCheckout(payload.productId, payload.units);
    },
    [startCheckout],
  );

  const requestSwitchPlan = useCallback(
    (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => {
      setPendingSwitchPlan(payload);
      setSwitchPlanDialogOpen(true);
    },
    [],
  );

  const confirmSwitchPlan = useCallback(async () => {
    if (!updateRef || !pendingSwitchPlan) return;
    const payload = pendingSwitchPlan;
    const subId = matchedSubscription?.id;
    setSwitchPlanDialogOpen(false);
    setPendingSwitchPlan(null);
    setActionError(null);
    try {
      await client.mutation(
        updateRef,
        {
          productId: payload.productId,
          ...(subId ? { subscriptionId: subId } : {}),
        },
        {
          optimisticUpdate: (store) => {
            const current = store.getQuery(billingUiModelRef, {});
            if (current) {
              const m = current as ConnectedBillingModel;
              store.setQuery(billingUiModelRef, {}, {
                ...m,
                activeSubscriptions: (m.activeSubscriptions ?? []).map(
                  (s) =>
                    ownProductIds.has(s.productId)
                      ? { ...s, productId: payload.productId }
                      : s,
                ),
              });
            }
          },
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Switch failed",
      );
    }
  }, [
    updateRef,
    pendingSwitchPlan,
    matchedSubscription,
    client,
    billingUiModelRef,
    ownProductIds,
  ]);

  const handleUpdateSeats = useCallback(
    async (payload: { units: number }) => {
      if (!updateRef) return;
      const subId = matchedSubscription?.id;
      setActionError(null);
      try {
        await client.mutation(
          updateRef,
          {
            units: payload.units,
            ...(subId ? { subscriptionId: subId } : {}),
            updateBehavior,
          },
          {
            optimisticUpdate: (store) => {
              const current = store.getQuery(billingUiModelRef, {});
              if (current) {
                const m = current as ConnectedBillingModel;
                store.setQuery(billingUiModelRef, {}, {
                  ...m,
                  activeSubscriptions: (m.activeSubscriptions ?? []).map(
                    (s) =>
                      s.id === subId ? { ...s, seats: payload.units } : s,
                  ),
                });
              }
            },
          },
        );
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Seat update failed",
        );
      }
    },
    [updateRef, matchedSubscription, client, billingUiModelRef, updateBehavior],
  );

  const confirmCancelSubscription = useCallback(async () => {
    if (!cancelRef) return;
    const subId = matchedSubscription?.id;
    setCancelDialogOpen(false);
    setActionError(null);
    try {
      await client.mutation(
        cancelRef,
        {
          ...(subId ? { subscriptionId: subId } : {}),
        },
        {
          optimisticUpdate: (store) => {
            const current = store.getQuery(billingUiModelRef, {});
            if (current) {
              const m = current as ConnectedBillingModel;
              store.setQuery(billingUiModelRef, {}, {
                ...m,
                activeSubscriptions: (m.activeSubscriptions ?? []).map(
                  (s) =>
                    ownProductIds.has(s.productId)
                      ? { ...s, cancelAtPeriodEnd: true }
                      : s,
                ),
              });
            }
          },
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Cancel failed",
      );
    }
  }, [cancelRef, matchedSubscription, client, billingUiModelRef, ownProductIds]);

  const resumeSubscription = useCallback(async () => {
    if (!resumeRef) return;
    const subId = matchedSubscription?.id;
    setActionError(null);
    try {
      await client.mutation(
        resumeRef,
        {
          ...(subId ? { subscriptionId: subId } : {}),
        },
        {
          optimisticUpdate: (store) => {
            const current = store.getQuery(billingUiModelRef, {});
            if (current) {
              const m = current as ConnectedBillingModel;
              store.setQuery(billingUiModelRef, {}, {
                ...m,
                activeSubscriptions: (m.activeSubscriptions ?? []).map(
                  (s) =>
                    ownProductIds.has(s.productId)
                      ? { ...s, cancelAtPeriodEnd: false, status: "active" }
                      : s,
                ),
              });
            }
          },
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Resume failed",
      );
    }
  }, [resumeRef, matchedSubscription, client, billingUiModelRef, ownProductIds]);

  const openCancelDialog = useCallback(() => {
    setCancelDialogOpen(true);
  }, []);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      <div className="hidden" aria-hidden="true">
        {children}
      </div>

      <section className={`space-y-4 ${className}`}>
        {actionError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {!model ? (
          <p className="text-sm text-zinc-500">Loading billing model…</p>
        ) : (
          <>
            {ownsActiveSubscription && snapshot && (
              <ScheduledChangeBanner
                snapshot={{
                  ...snapshot,
                  metadata: {
                    ...snapshot.metadata,
                    cancelAtPeriodEnd: localCancelAtPeriodEnd,
                    currentPeriodEnd: localCurrentPeriodEnd,
                  },
                }}
                isLoading={isActionLoading}
                onResume={
                  resumeRef && canResume ? resumeSubscription : undefined
                }
              />
            )}
            <PaymentWarningBanner snapshot={snapshot} />

            <PricingSection
              plans={plans}
              snapshot={
                snapshot ? { ...snapshot, activePlanId } : null
              }
              selectedCycle={selectedCycle}
              products={allProducts}
              subscriptionProductId={localSubscriptionProductId}
              subscriptionStatus={localSubscriptionState}
              subscriptionTrialEnd={
                matchedSubscription?.trialEnd ?? null
              }
              units={units}
              showSeatPicker={showSeatPicker}
              twoColumnLayout={twoColumnLayout}
              subscribedSeats={localSubscribedSeats}
              isGroupSubscribed={ownsActiveSubscription}
              onCycleChange={setSelectedCycle}
              disableCheckout={!canCheckout}
              disableSwitch={!canChange}
              disableSeats={!canUpdateSeats}
              onCheckout={
                canCheckout ? handlePricingCheckout : undefined
              }
              onSwitchPlan={
                updateRef && canChange ? requestSwitchPlan : undefined
              }
              onUpdateSeats={
                updateRef && canUpdateSeats
                  ? handleUpdateSeats
                  : undefined
              }
              onCancelSubscription={
                cancelRef &&
                canCancel &&
                ownsActiveSubscription &&
                !localCancelAtPeriodEnd
                  ? openCancelDialog
                  : undefined
              }
            />

            <div className="flex flex-wrap items-center gap-3">
              {children}
            </div>

            {/* Cancel Dialog */}
            <Dialog.Root
              open={cancelDialogOpen}
              onOpenChange={(details: { open: boolean }) =>
                setCancelDialogOpen(details.open)
              }
            >
              <Portal>
                <Dialog.Backdrop className="dialog-backdrop" />
                <Dialog.Positioner className="dialog-positioner">
                  <Dialog.Content className="dialog-content">
                    <Dialog.CloseTrigger
                      className="icon-button-ghost-sm absolute right-2 top-2"
                      aria-label="Close dialog"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Dialog.CloseTrigger>
                    <Dialog.Title className="dialog-title">
                      Cancel subscription?
                    </Dialog.Title>
                    <Dialog.Description className="dialog-description">
                      Are you sure you want to cancel your subscription?
                      You will continue to have access until the end of
                      your current billing period.
                    </Dialog.Description>
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="dialog-action-danger"
                        onClick={confirmCancelSubscription}
                      >
                        Yes, cancel
                      </button>
                      <Dialog.CloseTrigger className="button-faded h-8 w-full">
                        Keep subscription
                      </Dialog.CloseTrigger>
                    </div>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>

            {/* Switch Plan Dialog */}
            <Dialog.Root
              open={switchPlanDialogOpen}
              onOpenChange={(details: { open: boolean }) => {
                setSwitchPlanDialogOpen(details.open);
                if (!details.open) setPendingSwitchPlan(null);
              }}
            >
              <Portal>
                <Dialog.Backdrop className="dialog-backdrop" />
                <Dialog.Positioner className="dialog-positioner">
                  <Dialog.Content className="dialog-content">
                    <Dialog.CloseTrigger
                      className="icon-button-ghost-sm absolute right-2 top-2"
                      aria-label="Close dialog"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Dialog.CloseTrigger>
                    <Dialog.Title className="dialog-title">
                      Switch plan?
                    </Dialog.Title>
                    <Dialog.Description className="dialog-description">
                      {pendingSwitchPlan?.plan?.title ? (
                        <>
                          You are about to switch to the{" "}
                          <strong>{pendingSwitchPlan.plan.title}</strong>{" "}
                          plan. The price difference will be prorated and
                          charged to your payment method.
                        </>
                      ) : (
                        "You are about to switch your plan. The price difference will be prorated and charged to your payment method."
                      )}
                    </Dialog.Description>
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="button-filled h-8 w-full"
                        onClick={confirmSwitchPlan}
                      >
                        Confirm switch
                      </button>
                      <Dialog.CloseTrigger className="button-faded h-8 w-full">
                        Cancel
                      </Dialog.CloseTrigger>
                    </div>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          </>
        )}
      </section>
    </SubscriptionContext.Provider>
  );
};
