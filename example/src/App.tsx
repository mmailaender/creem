import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  BillingGate,
  BillingToggle,
  CheckoutButton,
  CheckoutLink,
  CheckoutSuccessSummary,
  CustomerPortalButton,
  CustomerPortalLink,
  OneTimeCheckoutButton,
  OneTimeCheckoutLink,
  OneTimePaymentStatusBadge,
  PaymentWarningBanner,
  PricingCard,
  PricingSection,
  ScheduledChangeBanner,
  TrialLimitBanner,
} from "@mmailaender/creem/react";
import type {
  BillingSnapshot,
  PlanCatalogEntry,
  RecurringCycle,
} from "@mmailaender/creem";
import {
  insertTodoOptimistic,
  completeTodoOptimistic,
  deleteTodoOptimistic,
} from "@/optimistic";

function PriceDisplay({
  price,
  billingPeriod,
}: {
  price: number;
  currency: string;
  billingPeriod?: string;
}) {
  const intervalLabel: Record<string, string> = {
    "every-month": "/mo",
    "every-three-months": "/3mo",
    "every-six-months": "/6mo",
    "every-year": "/yr",
  };
  return (
    <span>
      ${price / 100}
      {billingPeriod ? (intervalLabel[billingPeriod] ?? `/${billingPeriod}`) : ""}
    </span>
  );
}

export default function TodoList() {
  const user = useQuery(api.example.getCurrentUser);
  const todos = useQuery(api.example.listTodos);
  const products = useQuery(api.billing.getConfiguredProducts);
  const allProducts = useQuery(api.billing.listAllProducts);
  const insertTodo = useMutation(api.example.insertTodo).withOptimisticUpdate(
    insertTodoOptimistic,
  );
  const completeTodo = useMutation(
    api.example.completeTodo,
  ).withOptimisticUpdate(completeTodoOptimistic);
  const deleteTodo = useMutation(api.example.deleteTodo).withOptimisticUpdate(
    deleteTodoOptimistic,
  );
  const createDemoUser = useMutation(api.example.createDemoUser);
  const cancelSubscription = useAction(api.billing.cancelCurrentSubscription);
  const changeSubscription = useAction(api.billing.changeCurrentSubscription);
  const [newTodo, setNewTodo] = useState("");
  const [isCreatingDemoUser, setIsCreatingDemoUser] = useState(false);
  const [selectedCycle, setSelectedCycle] =
    useState<RecurringCycle>("every-month");

  const todosLength = todos?.length ?? 0;
  const isAtMaxTodos = user?.maxTodos && todosLength >= user.maxTodos;

  const {
    basicTrialMonthly: premiumMonthly,
    basicTrialYearly: premiumYearly,
    premiumTrialMonthly: premiumPlusMonthly,
    premiumTrialYearly: premiumPlusYearly,
  } = products ?? {};

  const checkoutApi = {
    generateCheckoutLink: api.billing.generateCheckoutLink,
  } as const;
  const customerPortalApi = {
    generateCustomerPortalUrl: api.billing.generateCustomerPortalUrl,
  } as const;

  const showcaseProductId =
    allProducts?.[0]?.id ?? premiumMonthly?.id ?? premiumPlusMonthly?.id;

  const pricingPlans: PlanCatalogEntry[] = [];
  if (premiumMonthly) {
    pricingPlans.push({
      planId: "premium",
      category: "paid",
      billingType: "recurring",
      billingCycles: ["every-month", "every-year"],
      creemProductIds: {
        default: premiumMonthly.id,
        "every-month": premiumMonthly.id,
        ...(premiumYearly ? { "every-year": premiumYearly.id } : {}),
      },
    });
  }
  if (premiumPlusMonthly) {
    pricingPlans.push({
      planId: "premium-plus",
      category: "paid",
      billingType: "recurring",
      billingCycles: ["every-month", "every-year"],
      creemProductIds: {
        default: premiumPlusMonthly.id,
        "every-month": premiumPlusMonthly.id,
        ...(premiumPlusYearly ? { "every-year": premiumPlusYearly.id } : {}),
      },
    });
  }
  pricingPlans.push({
    planId: "enterprise",
    category: "enterprise",
    billingType: "custom",
    contactUrl: "https://creem.io",
  });

  const featuredPlan = pricingPlans[0];

  const activeCategory = user?.isTrialing
    ? "trial"
    : user?.isFree
      ? "free"
      : "paid";

  const baseSnapshot: BillingSnapshot | null = user
    ? {
        resolvedAt: new Date().toISOString(),
        activePlanId: user.subscription?.productId ?? null,
        activeCategory,
        billingType: user.subscription ? "recurring" : "custom",
        recurringCycle: selectedCycle,
        availableBillingCycles: ["every-month", "every-year"],
        subscriptionState: user.subscription?.status,
        payment: null,
        availableActions: user.subscription
          ? ["portal", "cancel", "switch_interval", "checkout"]
          : ["checkout"],
        metadata: {
          trialEnd: user.trialEnd ?? undefined,
        },
      }
    : null;

  const scheduledSnapshot: BillingSnapshot | null = baseSnapshot
    ? {
        ...baseSnapshot,
        metadata: {
          ...(baseSnapshot.metadata ?? {}),
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 14,
          ).toISOString(),
        },
      }
    : null;

  const warningSnapshot: BillingSnapshot | null = baseSnapshot
    ? {
        ...baseSnapshot,
        payment: {
          status: "pending",
          checkoutId: "ch_demo_pending",
          productId: showcaseProductId,
        },
      }
    : null;

  const trialSnapshot: BillingSnapshot | null = baseSnapshot
    ? {
        ...baseSnapshot,
        activeCategory: "trial",
        metadata: {
          ...(baseSnapshot.metadata ?? {}),
          trialEnd:
            user?.trialEnd ??
            new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
      }
    : null;

  const getButtonText = (targetProductId: string) => {
    if (!user?.subscription) return "Upgrade";
    const isPremium =
      user.subscription.productId === premiumMonthly?.id ||
      user.subscription.productId === premiumYearly?.id;
    const targetIsPremiumPlus =
      targetProductId === premiumPlusMonthly?.id ||
      targetProductId === premiumPlusYearly?.id;
    if (isPremium && targetIsPremiumPlus) {
      return "Upgrade";
    }
    return "Downgrade";
  };

  const handleCreateDemoUser = async () => {
    if (isCreatingDemoUser) return;
    setIsCreatingDemoUser(true);
    try {
      await createDemoUser({});
    } finally {
      setIsCreatingDemoUser(false);
    }
  };

  const handlePlanChange = async (productId: string) => {
    if (!user?.subscription) return;
    const action = getButtonText(productId);
    if (
      confirm(
        `Are you sure you want to ${action.toLowerCase()} your subscription? Any price difference will be prorated.`,
      )
    ) {
      await changeSubscription({ productId });
    }
  };

  const handleCancelSubscription = async () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? This will immediately end your subscription and any remaining time will be prorated and refunded.",
      )
    ) {
      await cancelSubscription({ revokeImmediately: true });
    }
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const todo = newTodo.trim();
    if (todo) {
      if (!user) {
        alert("Create a demo user first.");
        return;
      }
      if (isAtMaxTodos) {
        alert(
          "You've reached the maximum number of todos for your current plan. Please upgrade to add more!",
        );
        return;
      }
      insertTodo({ text: todo });
      setNewTodo("");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-950 py-10 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4">
        {/* Introduction */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30">
          <h1 className="text-2xl font-light mb-4 text-gray-800 dark:text-gray-100">
            Creem Subscription Example
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This example demonstrates Creem subscription management capabilities
            including trial support, multiple price types, and product features.
            Test it out by:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-4">
            <li>
              Adding todos (limits: Free=3, Premium=6, Premium Plus=unlimited)
            </li>
            <li>Starting a free trial for Premium</li>
            <li>Upgrading/downgrading between plans</li>
            <li>Managing subscriptions via the customer portal</li>
            <li>Browsing the product showcase for all synced products</li>
          </ol>
        </div>

        {user === null ? (
          <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30">
            <h2 className="text-2xl font-light mb-2 text-gray-800 dark:text-gray-100">
              Create demo data
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This example is auth-free. Create a demo user to continue testing
              todos and Creem checkout flows.
            </p>
            <Button
              onClick={handleCreateDemoUser}
              disabled={isCreatingDemoUser}
            >
              {isCreatingDemoUser
                ? "Creating demo user..."
                : "Create demo user"}
            </Button>
          </div>
        ) : (
          <>
            {/* Todo List */}
            <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30">
              <h2 className="text-3xl font-light mb-6 text-gray-800 dark:text-gray-100">
                Todo List
              </h2>
              <form onSubmit={addTodo} className="mb-6">
                <Input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Add a new task"
                  className="w-full text-lg py-2 border-b border-gray-300 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors duration-300 bg-transparent dark:text-gray-100 dark:placeholder-gray-400"
                />
              </form>
              {isAtMaxTodos && (
                <div className="flex items-center text-yellow-600 dark:text-yellow-400 mb-4">
                  <AlertCircle className="mr-2" />
                  <span>
                    You've reached the limit for your current plan. Upgrade to
                    add more!
                  </span>
                </div>
              )}
              <ul className="space-y-2">
                {todos?.map((todo) => (
                  <li
                    key={todo._id}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800"
                  >
                    <button
                      onClick={() =>
                        completeTodo({
                          todoId: todo._id,
                          completed: !todo.completed,
                        })
                      }
                      className={`text-lg flex-grow text-left ${
                        todo.completed
                          ? "line-through text-gray-400 dark:text-gray-500"
                          : "text-gray-800 dark:text-gray-100"
                      }`}
                    >
                      {todo.text}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTodo({ todoId: todo._id })}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Current Subscription */}
            <div className="mt-8 p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-gray-800 dark:text-gray-100">
                  Subscription
                </h2>
                {user?.subscription && (
                  <CustomerPortalLink
                    creemApi={{
                      generateCustomerPortalUrl:
                        api.billing.generateCustomerPortalUrl,
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Manage Subscription
                  </CustomerPortalLink>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                  {user?.subscription?.product.name || "Free"}
                </span>
                {user?.isTrialing && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    Trial
                    {user.trialEnd && (
                      <>
                        {" "}
                        &middot; ends{" "}
                        {new Date(user.trialEnd).toLocaleDateString()}
                      </>
                    )}
                  </span>
                )}
                {user?.subscription?.amount && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ${user.subscription.amount / 100}/
                    {user.subscription.recurringInterval}
                  </span>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  •{" "}
                  {user?.isPremium
                    ? "Unlimited todos"
                    : user?.isBasic
                      ? "Up to 6 todos"
                      : "Up to 3 todos"}
                </span>
              </div>

              {user?.subscription && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={handleCancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </div>

            {/* React Billing UI Showcase */}
            <div className="mt-8 p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30 space-y-5">
              <h2 className="text-2xl font-light text-gray-800 dark:text-gray-100">
                Billing UI Components (React)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This section demonstrates all exported React billing components.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <BillingToggle
                  cycles={["every-month", "every-year"]}
                  value={selectedCycle}
                  onValueChange={setSelectedCycle}
                />
                <OneTimePaymentStatusBadge
                  status="pending"
                  className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                />
                <OneTimePaymentStatusBadge
                  status="paid"
                  className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                />
              </div>

              <TrialLimitBanner snapshot={trialSnapshot} />
              <ScheduledChangeBanner snapshot={scheduledSnapshot} />
              <PaymentWarningBanner snapshot={warningSnapshot} />

              <BillingGate
                snapshot={baseSnapshot}
                requiredActions="portal"
                fallback={
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Portal access requires an active subscription.
                  </p>
                }
              >
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  BillingGate unlocked: this user can access portal actions.
                </p>
              </BillingGate>

              <div className="flex flex-wrap gap-3">
                {showcaseProductId ? (
                  <>
                    <CheckoutButton
                      creemApi={checkoutApi}
                      productId={showcaseProductId}
                      lazy
                    >
                      CheckoutButton
                    </CheckoutButton>
                    <OneTimeCheckoutButton
                      creemApi={checkoutApi}
                      productId={showcaseProductId}
                      lazy
                    >
                      OneTimeCheckoutButton
                    </OneTimeCheckoutButton>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Product IDs unavailable. Sync products to test checkout
                    buttons.
                  </p>
                )}

                <CustomerPortalButton creemApi={customerPortalApi}>
                  CustomerPortalButton
                </CustomerPortalButton>
              </div>

              {featuredPlan && (
                <PricingCard
                  plan={featuredPlan}
                  selectedCycle={selectedCycle}
                  activePlanId={baseSnapshot?.activePlanId}
                  checkoutApi={checkoutApi}
                />
              )}

              <PricingSection
                plans={pricingPlans}
                snapshot={baseSnapshot ?? undefined}
                selectedCycle={selectedCycle}
                onCycleChange={setSelectedCycle}
                checkoutApi={checkoutApi}
              />

              <CheckoutSuccessSummary
                params={{
                  checkoutId: "ch_demo_success",
                  orderId: "ord_demo_success",
                  productId: showcaseProductId,
                }}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              />
            </div>

            {/* Configured Products */}
            {premiumMonthly && !user?.isTrialing && (
              <div className="mt-8 p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30">
                <h2 className="text-2xl font-light mb-2 text-gray-800 dark:text-gray-100">
                  Configured Products
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Uses{" "}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    getConfiguredProducts
                  </code>{" "}
                  — products are mapped by key with hardcoded Creem product IDs.
                </p>
                <div className="space-y-2">
                  {/* Premium */}
                  {premiumMonthly && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Premium</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            ${(premiumMonthly.price ?? 0) / 100}
                            /month
                          </span>
                          {premiumYearly && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              or ${(premiumYearly.price ?? 0) / 100}
                              /year
                            </span>
                          )}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            • Up to 6 todos
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {user?.subscription?.productId !== premiumMonthly.id &&
                          user?.subscription?.productId !== premiumYearly?.id &&
                          (user?.isFree ? (
                            <div className="flex items-center gap-3">
                              <CheckoutLink
                                creemApi={{
                                  generateCheckoutLink:
                                    api.billing.generateCheckoutLink,
                                }}
                                productId={premiumMonthly.id}
                                className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                              >
                                Start checkout
                              </CheckoutLink>
                              <CheckoutLink
                                creemApi={{
                                  generateCheckoutLink:
                                    api.billing.generateCheckoutLink,
                                }}
                                productId={premiumMonthly.id}
                                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                Upgrade to Premium
                              </CheckoutLink>
                            </div>
                          ) : (
                            <Button
                              variant="link"
                              className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-0 h-auto"
                              onClick={() =>
                                handlePlanChange(premiumMonthly.id)
                              }
                            >
                              {getButtonText(premiumMonthly.id)} to Premium
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Premium Plus */}
                  {premiumPlusMonthly && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Premium Plus</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            ${(premiumPlusMonthly.price ?? 0) / 100}
                            /month
                          </span>
                          {premiumPlusYearly && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              or ${(premiumPlusYearly.price ?? 0) / 100}
                              /year
                            </span>
                          )}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            • Unlimited todos
                          </span>
                        </div>
                      </div>
                      {user?.subscription?.productId !==
                        premiumPlusMonthly.id &&
                        user?.subscription?.productId !==
                          premiumPlusYearly?.id &&
                        (user?.isFree ? (
                          <CheckoutLink
                            creemApi={{
                              generateCheckoutLink:
                                api.billing.generateCheckoutLink,
                            }}
                            productId={premiumPlusMonthly.id}
                            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Upgrade to Premium Plus
                          </CheckoutLink>
                        ) : (
                          <Button
                            variant="link"
                            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-0 h-auto"
                            onClick={() =>
                              handlePlanChange(premiumPlusMonthly.id)
                            }
                          >
                            {getButtonText(premiumPlusMonthly.id)} to Premium
                            Plus
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Products Showcase */}
            <div className="mt-8 p-6 bg-white dark:bg-gray-950 border border-transparent dark:border-gray-900 rounded-lg shadow-lg dark:shadow-gray-800/30">
              <h2 className="text-2xl font-light mb-2 text-gray-800 dark:text-gray-100">
                All Products
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Uses{" "}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  listAllProducts
                </code>{" "}
                — dynamically lists all synced products from Creem,
                demonstrating different price types and features.
              </p>
              {allProducts && allProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-800 dark:text-gray-100">
                          {product.name}
                        </h3>
                        {product.billingType && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              {product.billingType === "recurring" ? product.billingPeriod : "one-time"}
                            </span>
                          )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {product.description}
                        </p>
                      )}

                      {/* Price */}
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <PriceDisplay
                          price={product.price}
                          currency={product.currency}
                          billingPeriod={product.billingPeriod}
                        />
                      </div>

                      {/* Features */}
                      {product.features && product.features.length > 0 && (
                        <ul className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                          {product.features.map((feature: any) => (
                            <li
                              key={feature.id}
                              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                            >
                              <span className="text-green-500 mt-0.5">
                                &#10003;
                              </span>
                              <span>{feature.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Checkout — lazy to avoid rate limits from eager fetching */}
                      {user?.subscription?.productId !== product.id && (
                        <div className="pt-2">
                          <OneTimeCheckoutLink
                            creemApi={{
                              generateCheckoutLink:
                                api.billing.generateCheckoutLink,
                            }}
                            productId={product.id}
                            lazy
                            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Buy/Subscribe to {product.name}
                          </OneTimeCheckoutLink>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No products synced yet. Run the seed script and sync products
                  from Creem.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
