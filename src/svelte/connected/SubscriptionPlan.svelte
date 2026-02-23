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
    displayName?: string;
    description?: string;
    contactUrl?: string;
    productIds?: Partial<Record<RecurringCycle, string>>;
  }

  let {
    planId = undefined,
    type,
    displayName = undefined,
    description = undefined,
    contactUrl = undefined,
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
      displayName,
      description,
      contactUrl,
      productIds,
    };
    const unregister = untrack(() => context.registerPlan(registration));
    return () => untrack(unregister);
  });
</script>
