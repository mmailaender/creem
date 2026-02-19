<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { billingState } from '$lib/billing/model/state.svelte';
	import LockedStateScreen from './LockedStateScreen.svelte';
	import PaymentWarningBanner from './PaymentWarningBanner.svelte';
	import AppPlanChangeBanner from './AppPlanChangeBanner.svelte';
	import TrialLimitBanner from './TrialLimitBanner.svelte';

	type Props = {
		gatedContent: import('svelte').Snippet;
	};

	let { gatedContent }: Props = $props();

	const currentPlanQuery = useQuery(api.billing.queries.getCurrentPlan, {});
	const currentPlan = $derived(currentPlanQuery.data);

	// Dismissible banner states (persisted in session)
	let paymentWarningDismissed = $state(false);
	let planChangeDismissed = $state(false);

	// Update shared billing state when currentPlan changes
	$effect(() => {
		billingState.isReadOnly = currentPlan?.isReadOnly ?? false;
	});

	// Banner container ref for dynamic height CSS variable
	let bannerContainer: HTMLDivElement | undefined = $state();

	// Update --banner-height CSS variable when banner container height changes
	$effect(() => {
		if (bannerContainer) {
			const height = bannerContainer.offsetHeight;
			document.documentElement.style.setProperty('--banner-height', `${height}px`);
		} else {
			document.documentElement.style.setProperty('--banner-height', '0px');
		}
	});

	// Priority-based state determination
	const gateState = $derived.by(() => {
		if (!currentPlan) return 'loading';

		// Priority 1: Locked state (no plans)
		if (currentPlan.isLocked) return 'locked';

		// Priority 2: Expired (payment failure lock - must resubscribe)
		if (currentPlan.status === 'expired') return 'expired';

		// Priority 3: Payment failed (warning banner before expiry)
		if (currentPlan.requiresPaymentUpdate && !paymentWarningDismissed) return 'payment_warning';

		// Priority 4: Trial limit reached (not dismissible)
		if (currentPlan.isTrialLimitReached) return 'trial_limit';

		// Priority 5: Scheduled cancel/change (info banner)
		// Use status 'scheduled_cancel' as the source of truth from Creem
		if (currentPlan.status === 'scheduled_cancel' && !planChangeDismissed)
			return 'scheduled_change';

		return 'ok';
	});

	// Check if any banner is visible
	const hasBanner = $derived(
		gateState === 'payment_warning' ||
			gateState === 'trial_limit' ||
			gateState === 'scheduled_change'
	);
</script>

<!-- Priority 1: Locked State (renders directly, no modal) -->
{#if gateState === 'locked'}
	<LockedStateScreen />
{/if}

<!-- Priority 2: Expired (payment failure lock - show locked modal) -->
{#if gateState === 'expired'}
	<LockedStateScreen />
{/if}

<!-- Banner container - used for dynamic height calculation -->
{#if hasBanner}
	<div bind:this={bannerContainer}>
		<!-- Priority 3: Payment Warning Banner (dismissible) -->
		{#if gateState === 'payment_warning' && currentPlan?.customerId}
			<PaymentWarningBanner
				customerId={currentPlan.customerId}
				onDismiss={() => (paymentWarningDismissed = true)}
			/>
		{/if}

		<!-- Priority 4: Trial Limit Banner (not dismissible) -->
		{#if gateState === 'trial_limit'}
			<TrialLimitBanner />
		{/if}

		<!-- Priority 5: Plan Change Banner (dismissible) -->
		{#if gateState === 'scheduled_change' && currentPlan?.scheduledPlanChangeTo && currentPlan?.currentPeriodEnd && currentPlan?.subscriptionId}
			<AppPlanChangeBanner
				scheduledChangeTo={currentPlan.scheduledPlanChangeTo}
				periodEndDate={currentPlan.currentPeriodEnd}
				subscriptionId={currentPlan.subscriptionId}
				onDismiss={() => (planChangeDismissed = true)}
			/>
		{/if}
	</div>
{/if}

<!-- Main content: Only render when not hard-blocked -->
<!-- This prevents bypassing via browser tools and avoids unnecessary queries -->
{#if gateState === 'loading'}
	<div class="flex min-h-[calc(100vh-var(--header-height))] items-center justify-center">
		<div
			class="border-primary-500 size-8 animate-spin rounded-full border-4 border-t-transparent"
		></div>
	</div>
{:else if gateState !== 'locked' && gateState !== 'expired'}
	{@render gatedContent()}
{/if}
