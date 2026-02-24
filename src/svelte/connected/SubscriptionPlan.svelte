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

  const context = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );

  if (!context) {
    throw new Error("Subscription.Plan must be used inside <Subscription>.");
  }

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
    const unregister = untrack(() => context.registerPlan(registration));
    return () => untrack(unregister);
  });
</script>
