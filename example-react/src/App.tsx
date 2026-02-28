import {
  CheckoutSuccessSummary,
  BillingPortal,
  Product,
  Subscription,
  type ConnectedBillingApi,
  type Transition,
} from "@mmailaender/convex-creem/react";
import { api } from "../../convex/_generated/api";
import creemLogoUrl from "./assets/creem-grey.svg";
import convexLogoUrl from "./assets/convex-grey.svg";

const connectedApi: ConnectedBillingApi = {
  uiModel: api.billing.uiModel,
  checkouts: {
    create: api.billing.checkoutsCreate,
  },
  subscriptions: {
    update: api.billing.subscriptionsUpdate,
    cancel: api.billing.subscriptionsCancel,
    resume: api.billing.subscriptionsResume,
  },
  customers: {
    portalUrl: api.billing.customersPortalUrl,
  },
};

const upgradeTransitions: Transition[] = [
  {
    from: "prod_4Di7Lkhf3TXy4UOKsUrGw0",
    to: "prod_56sJIyL7piLCVv270n4KBz",
    kind: "via_product",
    viaProductId: "prod_5LApsYRX8dHbx8QuLJgJ3j",
  },
];

export default function App() {
  return (
    <main className="w-full py-10 lg:pt-16">
      <header className="border-b border-border-subtle pb-16 lg:pb-[104px]">
        <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-2">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="display-m max-w-[720px] text-foreground-default">
              Connected Billing Widgets
            </h1>
            <p className="subtitle-m max-w-[720px] text-foreground-default">
              These widgets query Convex directly through the Creem wrapper API
              using convex/react, with backend-derived billing state in the UI
              model.
            </p>
            <div className="flex items-center gap-4 pt-8 text-foreground-placeholder">
              <span className="inline-flex h-10 items-center justify-center">
                <img src={creemLogoUrl} alt="Creem" className="h-9 w-9" />
              </span>
              <span className="inline-flex h-10 w-10 items-center justify-center">
                <img src={convexLogoUrl} alt="Convex" className="h-9 w-9" />
              </span>
            </div>
          </div>

          <nav className="lg:col-start-10 lg:col-span-3 space-y-10 lg:pt-2">
            <div className="space-y-4">
              <p className="label-m text-foreground-placeholder">
                SUBSCRIPTIONS WIDGETS
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    01
                  </span>
                  <a href="#subscription-with-trial" className="link-inline">
                    With Trial (4 Cycles)
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    02
                  </span>
                  <a href="#subscription-without-trial" className="link-inline">
                    Without Trial (Monthly Only)
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    03
                  </span>
                  <a
                    href="#subscription-seat-selectable"
                    className="link-inline"
                  >
                    Seat-Based (User-Selectable)
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    04
                  </span>
                  <a href="#subscription-seat-auto" className="link-inline">
                    Seat-Based (Auto-Derived)
                  </a>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <p className="label-m text-foreground-placeholder">
                ONE TIME PURCHASE WIDGETS
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    05
                  </span>
                  <a href="#onetime-single" className="link-inline">
                    Single One-Time Product
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    06
                  </span>
                  <a href="#onetime-group" className="link-inline">
                    Mutually Exclusive Product Group
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="label-m text-foreground-placeholder inline-block w-6 shrink-0">
                    07
                  </span>
                  <a href="#onetime-repeat" className="link-inline">
                    Repeating Product (Consumable)
                  </a>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 space-y-14 pt-14">
        <CheckoutSuccessSummary className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" />

        {/* ─── Section 1: Subscriptions with trial (all 4 billing cycles) ─── */}
        <section
          id="subscription-with-trial"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[104px]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[104px]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  Subscription
                </span>
                <br />
                With Trial (4 Cycles)
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                All four billing cycles are available. The toggle derives from
                the registered plans automatically.
              </p>
            </div>

            <div className="mt-10">
              <Subscription.Root api={connectedApi} className="">
                <Subscription.Item
                  type="free"
                  title="Free"
                  description={`✔️ Up to 3 users\n\n✔️ Basic task management\n\n✔️ Drag & drop builder\n\n✔️ Task deadlines & reminders\n\n✔️ Mobile access\n\n✔️ Priority support\n\n✔️ 1-1 calls\n`}
                />
                <Subscription.Item
                  planId="basic"
                  type="single"
                  title="Basic"
                  productIds={{
                    "every-month": "prod_4if4apw1SzOXSUAfGL0Jp9",
                    "every-three-months": "prod_5SxwV6WbbluzUQ2FmZ4trD",
                    "every-six-months": "prod_7Lhs8en6kiBONIywQUlaQC",
                    "every-year": "prod_KE9mMfH58482NIbKgK4nF",
                  }}
                />
                <Subscription.Item
                  planId="premium"
                  type="single"
                  title="Premium"
                  recommended
                  productIds={{
                    "every-month": "prod_7Cukw2hVIT5DvozmomK67A",
                    "every-three-months": "prod_7V5gRIqWgui5wQflemUBOF",
                    "every-six-months": "prod_4JN9cHsEto3dr0CQpgCxn4",
                    "every-year": "prod_6ytx0cFhBvgXLp1jA6CQqH",
                  }}
                />
                <Subscription.Item
                  type="enterprise"
                  title="Enterprise"
                  description={`✔️ Up to 3 users\n\n✔️ Basic task management\n\n✔️ Drag & drop builder\n\n✔️ Task deadlines & reminders\n\n✔️ Mobile access\n\n✔️ Priority support\n\n✔️ 1-1 calls\n`}
                  contactUrl="https://creem.io"
                />
              </Subscription.Root>
            </div>

            <div className="flex justify-center pt-16">
              <BillingPortal api={connectedApi} className="button-faded" />
            </div>
          </div>
        </section>

        {/* ─── Section 2: Subscriptions without trial (monthly only) ─── */}
        <section
          id="subscription-without-trial"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[6.5rem]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[6.5rem]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  Subscription
                </span>
                <br />
                Without Trial (Monthly Only)
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                Only monthly products registered. The billing toggle should not
                appear.
              </p>
            </div>

            <div className="mt-[6.5rem]">
              <Subscription.Root api={connectedApi}>
                <Subscription.Item
                  type="free"
                  title="Free"
                  description={`✔️ Up to 3 users\n\n✔️ Basic task management\n\n✔️ Drag & drop builder\n\n✔️ Task deadlines & reminders\n\n✔️ Mobile access\n\n✔️ Priority support\n\n✔️ 1-1 calls\n`}
                />
                <Subscription.Item
                  planId="basic-monthly"
                  type="single"
                  title="Basic"
                  productIds={{ "every-month": "prod_53CU7duHB58lGTUqKlRroI" }}
                />
                <Subscription.Item
                  planId="professional-monthly"
                  type="single"
                  title="Professional"
                  productIds={{ "every-month": "prod_3ymOe55fDzKgmPoZnPEOBq" }}
                />
              </Subscription.Root>
            </div>

            <div className="flex justify-center pt-16">
              <BillingPortal api={connectedApi} className="button-faded" />
            </div>
          </div>
        </section>

        {/* ─── Section 3: Seat-based subscriptions ─── */}
        <section
          id="subscription-seat-selectable"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[6.5rem]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[6.5rem]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  Subscription
                </span>
                <br />
                Seat-Based (User-Selectable)
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                Seat-based plans with a quantity picker. The user selects how
                many seats before checkout.
              </p>
            </div>

            <div className="mt-[6.5rem]">
              <Subscription.Root api={connectedApi} showSeatPicker>
                <Subscription.Item
                  planId="basic-seat-monthly"
                  type="seat-based"
                  title="Basic"
                  productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
                />
                <Subscription.Item
                  planId="premium-seat-monthly"
                  type="seat-based"
                  title="Premium"
                  productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
                />
              </Subscription.Root>
            </div>

            <div className="flex justify-center pt-16">
              <BillingPortal api={connectedApi} className="button-faded" />
            </div>
          </div>
        </section>

        {/* ─── Section 3b: Seat-based with auto-derived units ─── */}
        <section
          id="subscription-seat-auto"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[6.5rem]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[6.5rem]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  Subscription
                </span>
                <br />
                Seat-Based (Auto-Derived)
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                Same seat-based products but with a fixed unit count (e.g.
                derived from organization member count). No picker shown —
                hardcoded to 5 seats.
              </p>
            </div>

            <div className="mt-[6.5rem]">
              <Subscription.Root api={connectedApi} units={5} twoColumnLayout>
                <Subscription.Item
                  planId="basic-seat-auto"
                  type="seat-based"
                  title="Basic"
                  productIds={{ "every-month": "prod_1c6ZGcxekHKrVYuWriHs68" }}
                />
                <Subscription.Item
                  planId="premium-seat-auto"
                  type="seat-based"
                  title="Premium"
                  productIds={{ "every-month": "prod_3861b06bJDnvpEBcs2uxYv" }}
                />
              </Subscription.Root>
            </div>
          </div>
        </section>

        {/* ─── Section 4: Standalone one-time product ─── */}
        <section
          id="onetime-single"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[6.5rem]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[6.5rem]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  One Time Purchase
                </span>
                <br />
                Single One-Time Product
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                A standalone product purchased once. Shows &ldquo;Owned&rdquo;
                after purchase.
              </p>
            </div>

            <div className="mt-[6.5rem]">
              <Product.Root
                api={connectedApi}
                layout="single"
                styleVariant="pricing"
              >
                <Product.Item
                  type="one-time"
                  title="One-time purchase"
                  productId="prod_6npEfkzgtr9hSqdWd7fqKG"
                />
              </Product.Root>
            </div>
          </div>
        </section>

        {/* ─── Section 5: Mutually exclusive product group with upgrade ─── */}
        <section
          id="onetime-group"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[6.5rem]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[6.5rem]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  One Time Purchase
                </span>
                <br />
                Mutually Exclusive Product Group
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                Transition graph decides available upgrade paths. Upgrading from
                Basic to Premium uses a dedicated delta product. Buy first the
                Basic Product and then upgrade to Premium.
              </p>
            </div>

            <div className="mt-[6.5rem]">
              <Product.Root
                api={connectedApi}
                transition={upgradeTransitions}
                styleVariant="pricing"
                showImages
              >
                <Product.Item
                  type="one-time"
                  title="Basic"
                  productId="prod_4Di7Lkhf3TXy4UOKsUrGw0"
                />
                <Product.Item
                  type="one-time"
                  title="Premium"
                  productId="prod_56sJIyL7piLCVv270n4KBz"
                />
              </Product.Root>
            </div>
          </div>
        </section>

        {/* ─── Section 6: Repeating (consumable) product ─── */}
        <section
          id="onetime-repeat"
          className="relative left-1/2 -translate-x-1/2 w-screen border-b border-border-subtle pb-[6.5rem]"
        >
          <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-16 pt-[6.5rem]">
            <div className="mx-auto grid grid-cols-12">
              <h2 className="heading-l col-span-12 text-center text-foreground-default lg:col-start-4 lg:col-span-6">
                <span className="text-foreground-placeholder">
                  One Time Purchase
                </span>
                <br />
                Repeating Product (Consumable)
              </h2>
              <p className="body-l col-span-12 mt-6 text-center text-foreground-muted lg:col-start-4 lg:col-span-6">
                Can be purchased multiple times. No &ldquo;Owned&rdquo; badge —
                always shows the purchase button.
              </p>
            </div>

            <div className="mt-[6.5rem]">
              <Product.Root
                api={connectedApi}
                layout="single"
                styleVariant="pricing"
                showImages
                pricingCtaVariant="filled"
              >
                <Product.Item
                  type="recurring"
                  productId="prod_73CnZ794MaJ1DUn8MU0O5f"
                />
              </Product.Root>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
