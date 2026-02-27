import {
  useEffect,
  useState,
  type PropsWithChildren,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useAction } from "convex/react";
import type { FunctionReference } from "convex/server";
import {
  hasBillingAction,
  hasCheckoutSuccessParams,
  parseCheckoutSuccessParams,
  renderMarkdown,
  type AvailableAction,
  type BillingSnapshot,
  type CheckoutSuccessParams,
  type OneTimePaymentStatus,
  type PaymentSnapshot,
  type RecurringCycle,
  type UIPlanEntry,
} from "../core/index.js";

const ONE_TIME_PAYMENT_STATUS_LABELS: Record<OneTimePaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

const BASE_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60";

const TERTIARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60";

const CARD_CLASS =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";

const cx = (...tokens: Array<string | undefined | false>) =>
  tokens.filter(Boolean).join(" ");

const CYCLE_KEY_ALIASES: Record<RecurringCycle, string[]> = {
  "every-month": ["every-month", "monthly", "month"],
  "every-three-months": ["every-three-months", "quarterly", "every-quarter"],
  "every-six-months": ["every-six-months", "semiannual", "semi-annually"],
  "every-year": ["every-year", "yearly", "annual"],
  custom: ["custom"],
};

const formatRecurringCycle = (cycle: RecurringCycle) => {
  if (cycle === "every-month") return "Monthly";
  if (cycle === "every-three-months") return "Quarterly";
  if (cycle === "every-six-months") return "Semi-annual";
  if (cycle === "every-year") return "Yearly";
  return "Custom";
};

const resolveProductIdForPlan = (
  plan: UIPlanEntry,
  selectedCycle: RecurringCycle | undefined,
) => {
  const productIds = plan.creemProductIds;
  if (!productIds) {
    return undefined;
  }

  const aliases = selectedCycle
    ? CYCLE_KEY_ALIASES[selectedCycle]
    : CYCLE_KEY_ALIASES.custom;
  for (const alias of aliases) {
    if (productIds[alias]) {
      return productIds[alias];
    }
    const partial = Object.entries(productIds).find(([key]) =>
      key.toLowerCase().includes(alias),
    );
    if (partial) {
      return partial[1];
    }
  }

  return Object.values(productIds)[0];
};

type CheckoutApi = { create: FunctionReference<"action"> };

export const CustomerPortalLink = ({
  creemApi,
  children,
  className,
}: PropsWithChildren<{
  creemApi: { portalUrl: FunctionReference<"action"> };
  className?: string;
}>) => {
  const generateCustomerPortalUrl = useAction(creemApi.portalUrl);
  const [portalUrl, setPortalUrl] = useState<string>();

  useEffect(() => {
    void generateCustomerPortalUrl({}).then((result) => {
      if (result) {
        setPortalUrl(result.url);
      }
    });
  }, [generateCustomerPortalUrl]);

  if (!portalUrl) {
    return null;
  }

  return (
    <a className={className} href={portalUrl} target="_blank">
      {children}
    </a>
  );
};

/** One-time checkout uses the same Creem checkout API, with naming optimized for one-time product flows. */
export const OneTimeCheckoutLink = (
  props: PropsWithChildren<{
    creemApi: CheckoutApi;
    productId: string;
    units?: number;
    metadata?: Record<string, string>;
    className?: string;
    lazy?: boolean;
  }>,
) => <CheckoutLink {...props} />;

export const CheckoutButton = ({
  className,
  children,
  ...props
}: PropsWithChildren<{
  creemApi: CheckoutApi;
  productId: string;
  units?: number;
  metadata?: Record<string, string>;
  lazy?: boolean;
  className?: string;
}>) => (
  <CheckoutLink {...props} className={cx(BASE_BUTTON_CLASS, className)}>
    {children ?? "Checkout"}
  </CheckoutLink>
);

export const OneTimeCheckoutButton = ({
  className,
  children,
  ...props
}: PropsWithChildren<{
  creemApi: CheckoutApi;
  productId: string;
  units?: number;
  metadata?: Record<string, string>;
  lazy?: boolean;
  className?: string;
}>) => (
  <OneTimeCheckoutLink {...props} className={cx(BASE_BUTTON_CLASS, className)}>
    {children ?? "Buy now"}
  </OneTimeCheckoutLink>
);

export const CustomerPortalButton = ({
  className,
  children,
  ...props
}: PropsWithChildren<{
  creemApi: { portalUrl: FunctionReference<"action"> };
  className?: string;
}>) => (
  <CustomerPortalLink
    {...props}
    className={cx(TERTIARY_BUTTON_CLASS, className)}
  >
    {children ?? "Manage billing"}
  </CustomerPortalLink>
);

export const BillingToggle = ({
  cycles,
  value,
  onValueChange,
  className,
}: {
  cycles: RecurringCycle[];
  value?: RecurringCycle;
  onValueChange?: (cycle: RecurringCycle) => void;
  className?: string;
}) => {
  if (cycles.length < 2) {
    return null;
  }

  return (
    <div
      className={cx(
        "inline-flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
      role="tablist"
      aria-label="Billing interval"
    >
      {cycles.map((cycle) => {
        const isActive = cycle === value;
        return (
          <button
            key={cycle}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm transition",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
            onClick={() => onValueChange?.(cycle)}
          >
            {formatRecurringCycle(cycle)}
          </button>
        );
      })}
    </div>
  );
};

export const PricingCard = ({
  plan,
  selectedCycle,
  activePlanId,
  checkoutApi,
  units,
  metadata,
  onContactSales,
  className,
}: {
  plan: UIPlanEntry;
  selectedCycle?: RecurringCycle;
  activePlanId?: string | null;
  checkoutApi?: CheckoutApi;
  units?: number;
  metadata?: Record<string, string>;
  onContactSales?: (plan: UIPlanEntry) => void;
  className?: string;
}) => {
  const isActive = activePlanId === plan.planId;
  const productId = resolveProductIdForPlan(plan, selectedCycle);

  return (
    <section className={cx(CARD_CLASS, className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {plan.title ?? plan.planId}
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {plan.category}
        </span>
      </div>

      {plan.description && (
        <div
          className="creem-prose mb-3 text-sm text-zinc-600 dark:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.description) }}
        />
      )}

      {plan.billingCycles && plan.billingCycles.length > 0 && (
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Available cycles:{" "}
          {plan.billingCycles.map(formatRecurringCycle).join(" · ")}
        </p>
      )}

      {isActive ? (
        <span className="inline-flex rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Current plan
        </span>
      ) : plan.category === "enterprise" ? (
        plan.contactUrl ? (
          <a className={cx(TERTIARY_BUTTON_CLASS)} href={plan.contactUrl}>
            Contact sales
          </a>
        ) : (
          <button
            type="button"
            className={cx(TERTIARY_BUTTON_CLASS)}
            onClick={() => onContactSales?.(plan)}
          >
            Contact sales
          </button>
        )
      ) : checkoutApi && productId ? (
        <CheckoutButton
          creemApi={checkoutApi}
          productId={productId}
          units={units}
          metadata={metadata}
          lazy
        >
          {plan.billingType === "onetime" ? "Buy now" : "Start checkout"}
        </CheckoutButton>
      ) : (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure a checkout handler to activate this plan.
        </span>
      )}
    </section>
  );
};

export const PricingSection = ({
  plans,
  snapshot,
  selectedCycle,
  onCycleChange,
  checkoutApi,
  units,
  metadata,
  onContactSales,
  className,
}: {
  plans: UIPlanEntry[];
  snapshot?: BillingSnapshot;
  selectedCycle?: RecurringCycle;
  onCycleChange?: (cycle: RecurringCycle) => void;
  checkoutApi?: CheckoutApi;
  units?: number;
  metadata?: Record<string, string>;
  onContactSales?: (plan: UIPlanEntry) => void;
  className?: string;
}) => {
  const cycleSet = new Set<RecurringCycle>();
  for (const plan of plans) {
    for (const cycle of plan.billingCycles ?? []) {
      cycleSet.add(cycle);
    }
  }
  const availableCycles = Array.from(cycleSet);
  const effectiveCycle =
    selectedCycle ?? snapshot?.recurringCycle ?? availableCycles[0];
  const showToggle = availableCycles.length > 1;

  return (
    <section className={cx("space-y-4", className)}>
      {showToggle && (
        <BillingToggle
          cycles={availableCycles}
          value={effectiveCycle}
          onValueChange={onCycleChange}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard
            key={plan.planId}
            plan={plan}
            selectedCycle={effectiveCycle}
            activePlanId={snapshot?.activePlanId}
            checkoutApi={checkoutApi}
            units={units}
            metadata={metadata}
            onContactSales={onContactSales}
          />
        ))}
      </div>
    </section>
  );
};

export const BillingGate = ({
  snapshot,
  requiredActions,
  fallback = null,
  children,
}: PropsWithChildren<{
  snapshot?: BillingSnapshot | null;
  requiredActions: AvailableAction | AvailableAction[];
  fallback?: ReactNode;
}>) => {
  if (!snapshot) {
    return <>{fallback}</>;
  }

  const actions = Array.isArray(requiredActions)
    ? requiredActions
    : [requiredActions];
  const canRender = actions.every((action) =>
    hasBillingAction(snapshot, action),
  );
  return <>{canRender ? children : fallback}</>;
};

export const ScheduledChangeBanner = ({
  snapshot,
  className,
}: {
  snapshot?: BillingSnapshot | null;
  className?: string;
}) => {
  if (!snapshot?.metadata || snapshot.metadata.cancelAtPeriodEnd !== true) {
    return null;
  }

  const currentPeriodEnd =
    typeof snapshot.metadata.currentPeriodEnd === "string"
      ? snapshot.metadata.currentPeriodEnd
      : undefined;

  return (
    <div
      className={cx(
        "rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        className,
      )}
    >
      Plan cancellation scheduled
      {currentPeriodEnd
        ? ` for ${new Date(currentPeriodEnd).toLocaleDateString()}.`
        : "."}
    </div>
  );
};

export const PaymentWarningBanner = ({
  snapshot,
  payment,
  className,
}: {
  snapshot?: BillingSnapshot | null;
  payment?: PaymentSnapshot | null;
  className?: string;
}) => {
  const activePayment = payment ?? snapshot?.payment ?? null;
  if (!activePayment || activePayment.status === "paid") {
    return null;
  }

  const message =
    activePayment.status === "pending"
      ? "Your payment is pending confirmation. We recommend waiting for webhook confirmation before granting permanent access."
      : activePayment.status === "partially_refunded"
        ? "This payment was partially refunded. Review entitlement and seat limits if they depend on purchase amount."
        : "This payment was refunded. Access should generally be revoked or downgraded.";

  return (
    <div
      className={cx(
        "rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
        className,
      )}
    >
      {message}
    </div>
  );
};

export const TrialLimitBanner = ({
  snapshot,
  trialEndsAt,
  className,
}: {
  snapshot?: BillingSnapshot | null;
  trialEndsAt?: string | null;
  className?: string;
}) => {
  if (snapshot?.activeCategory !== "trial") {
    return null;
  }

  const resolvedTrialEnd =
    trialEndsAt ??
    (typeof snapshot.metadata?.trialEnd === "string"
      ? snapshot.metadata.trialEnd
      : null);

  return (
    <div
      className={cx(
        "rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
        className,
      )}
    >
      Trial plan active
      {resolvedTrialEnd
        ? ` until ${new Date(resolvedTrialEnd).toLocaleDateString()}.`
        : ". Upgrade before your trial ends to avoid interruptions."}
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCheckoutSuccessParams = (
  search: string = typeof window === "undefined" ? "" : window.location.search,
) => {
  return parseCheckoutSuccessParams(search);
};

export const OneTimePaymentStatusBadge = ({
  status,
  className,
}: {
  status: OneTimePaymentStatus;
  className?: string;
}) => {
  return (
    <span className={className}>{ONE_TIME_PAYMENT_STATUS_LABELS[status]}</span>
  );
};

export const CheckoutSuccessSummary = ({
  params,
  className,
}: {
  params?: CheckoutSuccessParams;
  className?: string;
}) => {
  const currentSearchParams = useCheckoutSuccessParams();
  const parsed = params ?? currentSearchParams;
  if (!hasCheckoutSuccessParams(parsed)) {
    return null;
  }

  return (
    <div className={className}>
      <p>Checkout completed successfully.</p>
      <ul>
        {parsed.checkoutId && <li>Checkout: {parsed.checkoutId}</li>}
        {parsed.orderId && <li>Order: {parsed.orderId}</li>}
        {parsed.customerId && <li>Customer: {parsed.customerId}</li>}
        {parsed.productId && <li>Product: {parsed.productId}</li>}
        {parsed.requestId && <li>Request: {parsed.requestId}</li>}
      </ul>
    </div>
  );
};

/** Renders a checkout link for Creem. */
export const CheckoutLink = ({
  creemApi,
  productId,
  children,
  className,
  units,
  metadata,
  lazy = false,
}: PropsWithChildren<{
  creemApi: CheckoutApi;
  productId: string;
  units?: number;
  metadata?: Record<string, string>;
  className?: string;
  lazy?: boolean;
}>) => {
  const generateCheckoutLink = useAction(creemApi.create);
  const [checkoutLink, setCheckoutLink] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lazy) return;
    void generateCheckoutLink({
      productId,
      units,
      metadata,
      successUrl: window.location.href,
    }).then(({ url }) => setCheckoutLink(url));
  }, [lazy, productId, units, metadata, generateCheckoutLink]);

  const handleClick = lazy
    ? async (e: MouseEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
          const { url } = await generateCheckoutLink({
            productId,
            units,
            metadata,
            successUrl: window.location.href,
          });
          window.open(url, "_blank");
        } finally {
          setIsLoading(false);
        }
      }
    : undefined;

  return (
    <a
      className={className}
      href={checkoutLink ?? (lazy ? "#" : undefined)}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};
