<script lang="ts">
  import { getContext, untrack } from "svelte";
  import type { RecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";
  import type { SubscriptionPlanType } from "./types.js";

  interface Props {
    planId?: string;
    type: SubscriptionPlanType;
    title?: string;
    description?: string;
    contactUrl?: string;
    recommended?: boolean;
    productIds?: Partial<Record<RecurringCycle, string>>;
  }

  let {
    planId = undefined,
    type,
    title = undefined,
    description = undefined,
    contactUrl = undefined,
    recommended = undefined,
    productIds = undefined,
  }: Props = $props();

  // Must be used inside a <Subscription.Root>
  const rootContext = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );

  if (rootContext) {
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
      const unregister = untrack(() => rootContext.registerPlan(registration));
      return () => untrack(unregister);
    });
  }
</script>
