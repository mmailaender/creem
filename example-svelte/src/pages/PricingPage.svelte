<script lang="ts">
  import { setupConvex, useConvexClient, useQuery } from "convex-svelte";
  import type { RecurringCycle } from "@mmailaender/convex-creem";
  import { BillingToggle, type ConnectedBillingApi } from "@mmailaender/convex-creem/svelte";
  import { api } from "../../../convex/_generated/api.js";
  import PlanCard from "../components/PlanCard.svelte";

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is required for pricing page.");
  }
  setupConvex(convexUrl);

  const connectedApi: ConnectedBillingApi = {
    getBillingUiModel: api.billing.getBillingUiModel,
    generateCheckoutLink: api.billing.generateCheckoutLink,
    generateCustomerPortalUrl: api.billing.generateCustomerPortalUrl,
    changeCurrentSubscription: api.billing.changeCurrentSubscription,
    updateSubscriptionSeats: api.billing.updateSubscriptionSeats,
    cancelCurrentSubscription: api.billing.cancelCurrentSubscription,
    resumeCurrentSubscription: api.billing.resumeCurrentSubscription,
  };

  const BILLING_CYCLES: RecurringCycle[] = [
    "every-month",
    "every-three-months",
    "every-six-months",
    "every-year",
  ];

  const client = useConvexClient();
  const billingModelQuery = useQuery(connectedApi.getBillingUiModel, {});

  let selectedCycle = $state<RecurringCycle>("every-month");
  let isActionLoading = $state(false);
  let actionError = $state<string | null>(null);

  const model = $derived(billingModelQuery.data ?? null);
  const allProducts = $derived(model?.allProducts ?? []);
  const activeSubscriptions = $derived(model?.activeSubscriptions ?? []);

  const planDefs = [
    {
      planId: "free",
      name: "Started",
      description:
        "Ideal for individuals or small teams without budget that will like to try, how product will work.",
      ctaLabel: "Try for Free",
      includedTitle: "Started includes:",
      features: [
        "Up to 3 users",
        "Basic task management",
        "Drag & drop builder",
        "Task deadlines & reminders",
        "Mobile access",
      ],
      helpText: "I need help with billing issue",
      isRecommended: false,
      productIds: {} as Partial<Record<RecurringCycle, string>>,
    },
    {
      planId: "basic",
      name: "Basic",
      description:
        "Build for teams that need speed, structure and real-time collaboration.",
      ctaLabel: "Try for Free",
      includedTitle: "Started includes:",
      features: [
        "Up to 3 users",
        "Basic task management",
        "Drag & drop builder",
        "Task deadlines & reminders",
        "Mobile access",
        "Priority support",
        "1-1 calls",
      ],
      helpText: "I need help with billing issue",
      isRecommended: true,
      productIds: {
        "every-month": "prod_4if4apw1SzOXSUAfGL0Jp9",
        "every-three-months": "prod_5SxwV6WbbluzUQ2FmZ4trD",
        "every-six-months": "prod_7Lhs8en6kiBONIywQUlaQC",
        "every-year": "prod_KE9mMfH58482NIbKgK4nF",
      } as Partial<Record<RecurringCycle, string>>,
    },
    {
      planId: "premium",
      name: "Professional",
      description: "At the power, customization, and support your organization needs.",
      ctaLabel: "Try for Free",
      includedTitle: "Started includes:",
      features: [
        "Unlimited users",
        "Advanced task management",
        "Drag & drop builder",
        "Task deadlines & reminders",
        "Mobile access",
      ],
      helpText: "I need help with billing issue",
      isRecommended: false,
      productIds: {
        "every-month": "prod_7Cukw2hVIT5DvozmomK67A",
        "every-three-months": "prod_7V5gRIqWgui5wQflemUBOF",
        "every-six-months": "prod_4JN9cHsEto3dr0CQpgCxn4",
        "every-year": "prod_6ytx0cFhBvgXLp1jA6CQqH",
      } as Partial<Record<RecurringCycle, string>>,
    },
    {
      planId: "enterprise",
      name: "Enterprise",
      description: "",
      ctaLabel: "Contact sales",
      includedTitle: "Enterprise includes:",
      features: [],
      helpText: "I need help with billing issue",
      isRecommended: false,
      productIds: {} as Partial<Record<RecurringCycle, string>>,
      contactUrl: "https://creem.io",
    },
  ];

  const intervalLabel: Record<string, string> = {
    month: "/mo",
    "every-month": "/mo",
    "every-three-months": "/3mo",
    "every-six-months": "/6mo",
    year: "/yr",
    "every-year": "/yr",
  };

  const formatPrice = (amount: number, currency: string): string =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);

  const resolveProductId = (
    productIds: Partial<Record<RecurringCycle, string>>,
    cycle: RecurringCycle,
  ) => productIds[cycle] ?? productIds["every-month"];

  const getPriceForCycle = (
    productIds: Partial<Record<RecurringCycle, string>>,
    cycle: RecurringCycle,
  ) => {
    const productId = resolveProductId(productIds, cycle);
    if (!productId) return null;
    const product = allProducts.find((p) => p.id === productId);
    if (!product || product.price == null || !product.currency) return null;
    return {
      amount: formatPrice(product.price, product.currency),
      suffix: product.billingPeriod
        ? (intervalLabel[product.billingPeriod] ?? "")
        : "",
      productId,
    };
  };

  const allKnownPlanProductIds = $derived(
    new Set(
      planDefs.flatMap((plan) =>
        Object.values(plan.productIds).filter(Boolean) as string[],
      ),
    ),
  );

  const matchedSubscription = $derived(
    activeSubscriptions.find((sub) => allKnownPlanProductIds.has(sub.productId)) ?? null,
  );

  const activePlanId = $derived(
    matchedSubscription
      ? (planDefs.find((plan) =>
          Object.values(plan.productIds).includes(matchedSubscription.productId),
        )?.planId ?? null)
      : null,
  );

  const getPreferredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const getSuccessUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}`;
  };

  const startCheckout = async (productId: string) => {
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await client.action(connectedApi.generateCheckoutLink, {
        productId,
        successUrl: getSuccessUrl(),
        theme: getPreferredTheme(),
      });
      window.location.href = url;
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Checkout failed";
    } finally {
      isActionLoading = false;
    }
  };

  const switchPlan = async (productId: string) => {
    if (!connectedApi.changeCurrentSubscription) return;
    isActionLoading = true;
    actionError = null;
    try {
      await client.action(connectedApi.changeCurrentSubscription, { productId });
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Switch failed";
    } finally {
      isActionLoading = false;
    }
  };
</script>

<main class="bg-surface-subtle min-h-screen pb-[240px]">
  <div class="mx-auto w-full max-w-[1280px] px-2 pt-[104px]">
    <section class="mx-auto w-full max-w-[640px] text-center">
      <h1 class="display-s text-foreground-default">Pricing</h1>
      <p class="subtitle-m mt-3 text-foreground-muted">
        Upgrade to unlock more possibilities
      </p>
    </section>

    <section class="mt-10 flex justify-center">
      <BillingToggle
        cycles={BILLING_CYCLES}
        value={selectedCycle}
        onValueChange={(cycle) => {
          selectedCycle = cycle;
        }}
      />
    </section>

    {#if actionError}
      <div class="mt-6 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {actionError}
      </div>
    {/if}

    <section class="mt-28 grid grid-cols-1 gap-1 px-4 sm:px-6 xl:grid-cols-3 xl:px-16">
      {#each planDefs as plan}
        {@const price = getPriceForCycle(plan.productIds, selectedCycle)}
        {@const currentProductId = price?.productId}
        {@const isActiveProduct =
          matchedSubscription != null &&
          currentProductId != null &&
          matchedSubscription.productId === currentProductId}
        {@const isActivePlanOtherCycle =
          !isActiveProduct &&
          matchedSubscription != null &&
          activePlanId === plan.planId &&
          currentProductId != null}
        {@const isSiblingPlan =
          !isActiveProduct &&
          !isActivePlanOtherCycle &&
          matchedSubscription != null &&
          plan.planId !== "free" &&
          plan.planId !== "enterprise" &&
          currentProductId != null}
        {@const trialDaysLeft =
          isActiveProduct && matchedSubscription?.status === "trialing" && matchedSubscription.trialEnd
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(matchedSubscription.trialEnd).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                ),
              )
            : null}
        <PlanCard
          name={plan.name}
          price={plan.planId === "free" ? "$0" : (price?.amount ?? "Custom")}
          billingSuffix={plan.planId === "free" ? "/mo" : (price?.suffix ?? "")}
          description={plan.description}
          ctaLabel={
            plan.planId === "enterprise"
              ? "Contact sales"
              : isActivePlanOtherCycle
                ? "Switch interval"
                : isSiblingPlan
                  ? "Switch plan"
                  : plan.ctaLabel
          }
          includedTitle={plan.includedTitle}
          features={plan.features}
          helpText={plan.helpText}
          isRecommended={plan.isRecommended}
          disabled={isActionLoading}
          trialLabel={
            trialDaysLeft != null
              ? `Free trial · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
              : null
          }
          currentPlan={isActiveProduct && matchedSubscription?.status !== "trialing"}
          onAction={async () => {
            actionError = null;
            if (plan.planId === "enterprise") {
              window.open(plan.contactUrl ?? "https://creem.io", "_blank");
              return;
            }
            if (plan.planId === "free") {
              actionError = "Free plan does not require checkout.";
              return;
            }
            if (!currentProductId) {
              actionError = "No product is configured for this billing cycle.";
              return;
            }
            if (isSiblingPlan || isActivePlanOtherCycle) {
              await switchPlan(currentProductId);
              return;
            }
            await startCheckout(currentProductId);
          }}
        />
      {/each}
    </section>
  </div>
</main>
