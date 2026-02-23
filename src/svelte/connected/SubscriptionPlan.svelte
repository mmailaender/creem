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
    productId?: string;
    productIds?: Partial<Record<RecurringCycle | "default", string>>;
  }

  let {
    planId = undefined,
    type,
    displayName = undefined,
    description = undefined,
    contactUrl = undefined,
    productId = undefined,
    productIds = undefined,
  }: Props = $props();

  const context = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );

  if (!context) {
    throw new Error("Subscription.Plan must be used inside <Subscription>.");
  }

  $effect(() => {
    const resolvedPlanId = planId ?? productId ?? type;
    const registration = {
      planId: resolvedPlanId,
      type,
      displayName,
      description,
      contactUrl,
      productId,
      productIds,
    };
    const unregister = untrack(() => context.registerPlan(registration));
    return () => untrack(unregister);
  });
</script>
