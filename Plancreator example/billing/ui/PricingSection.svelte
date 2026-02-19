<script lang="ts">
	import { resolve } from '$app/paths';

	// Icons
	import { Hourglass } from '@lucide/svelte';
	// Primitives
	import { toast } from 'svelte-sonner';
	// Components
	import PricingCard from './PricingCard.svelte';
	import BillingToggle from './BillingToggle.svelte';
	import ScheduledChangeBanner from './ScheduledChangeBanner.svelte';

	import {
		PLAN_DEFINITIONS,
		PRODUCTS,
		type ProductSKU,
		type PlanType
	} from '$convex/billing/constants';
	import * as m from '$paraglide/messages';

	// Convex
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	// API
	import { useRoles } from '$lib/organizations/api/roles.svelte';

	type Props = {
		compact?: boolean;
	};

	let { compact = false }: Props = $props();

	const client = useConvexClient();
	const auth = useAuth();
	const isAuthenticated = $derived(auth.isAuthenticated);

	const currentPlanQuery = useQuery(api.billing.queries.getCurrentPlan, {});
	const currentPlan = $derived(currentPlanQuery.data);

	// Role-based access control for billing actions
	const roles = useRoles();
	const canManageBilling = $derived(roles.hasOwnerOrAdminRole);

	// Writable derived: syncs with subscription interval, but can be toggled by user
	let billingInterval = $derived.by<'month' | 'year'>(() => {
		if (currentPlan?.plan === 'private' && currentPlan.interval) {
			return currentPlan.interval;
		}
		return 'month';
	});
	let isProcessing = $state<PlanType | null>(null);
	let isReverting = $state(false);
	let isCanceling = $state(false);
	let isSwitchingInterval = $state(false);

	async function handleRevertScheduledChange() {
		if (!currentPlan?.subscriptionId) {
			toast.error(m.billing_revert_error());
			return;
		}

		isReverting = true;
		try {
			// Call Creem API via action to reactivate subscription
			await client.action(api.billing.actions.reactivateSubscription, {
				subscriptionId: currentPlan.subscriptionId
			});
			toast.success(m.billing_change_reverted());
		} catch (error) {
			console.error('Revert error:', error);
			toast.error(m.billing_revert_error());
		} finally {
			isReverting = false;
		}
	}

	async function handleCancelSubscription() {
		if (!currentPlan?.subscriptionId) {
			toast.error(m.pricing_cancellation_error());
			return;
		}

		isCanceling = true;
		try {
			// Call Creem API via action to cancel subscription
			await client.action(api.billing.actions.requestCancellation, {
				subscriptionId: currentPlan.subscriptionId
			});
			toast.success(m.pricing_cancellation_scheduled());
		} catch (error) {
			console.error('Cancel error:', error);
			toast.error(m.pricing_cancellation_error());
		} finally {
			isCanceling = false;
		}
	}

	async function handleUpgradeToYearly() {
		if (!currentPlan?.subscriptionId) {
			toast.error(m.billing_interval_switch_error());
			return;
		}

		isSwitchingInterval = true;
		try {
			await client.action(api.billing.actions.upgradeToYearly, {
				subscriptionId: currentPlan.subscriptionId
			});
			toast.success(m.billing_upgraded_to_yearly());
		} catch (error) {
			console.error('Upgrade to yearly error:', error);
			toast.error(m.billing_interval_switch_error());
		} finally {
			isSwitchingInterval = false;
		}
	}

	async function handleRequestSwitchToMonthly() {
		if (!currentPlan?.subscriptionId) {
			toast.error(m.billing_interval_switch_error());
			return;
		}

		isSwitchingInterval = true;
		try {
			await client.action(api.billing.actions.requestSwitchToMonthly, {
				subscriptionId: currentPlan.subscriptionId
			});
			toast.success(m.billing_switch_to_monthly_scheduled());
		} catch (error) {
			console.error('Switch to monthly error:', error);
			toast.error(m.billing_interval_switch_error());
		} finally {
			isSwitchingInterval = false;
		}
	}

	async function handleRevertIntervalChange() {
		if (!currentPlan?.subscriptionId) {
			toast.error(m.billing_revert_error());
			return;
		}

		isSwitchingInterval = true;
		try {
			await client.action(api.billing.actions.revertScheduledIntervalChange, {
				subscriptionId: currentPlan.subscriptionId
			});
			toast.success(m.billing_interval_change_reverted());
		} catch (error) {
			console.error('Revert interval change error:', error);
			toast.error(m.billing_revert_error());
		} finally {
			isSwitchingInterval = false;
		}
	}

	const selectedProduct = $derived.by(() => {
		const sku: ProductSKU = billingInterval === 'year' ? 'private-yearly' : 'private-monthly';
		return PRODUCTS[sku];
	});

	function currentTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('default', {
			dateStyle: 'medium'
		}).format(new Date(timestamp));
	}

	function handleSelectTrial() {
		if (isAuthenticated) {
			window.location.href = resolve('/plan');
		} else {
			window.location.href = resolve('/signin') + '?redirect=/plan';
		}
	}

	async function handleSelectOpen() {
		if (!isAuthenticated) {
			window.location.href = resolve('/signin') + '?redirect=/plan&upgrade=open';
			return;
		}

		// If user is on Private plan, schedule downgrade to Open at period end
		if (currentPlan?.plan === 'private' && currentPlan?.subscriptionId) {
			isProcessing = 'open';
			try {
				// Call Creem API via action to cancel subscription (will switch to Open at period end)
				await client.action(api.billing.actions.requestDowngradeToOpen, {
					subscriptionId: currentPlan.subscriptionId
				});
				toast.success(m.pricing_downgrade_scheduled());
			} catch (error) {
				console.error('Downgrade error:', error);
				toast.error(m.pricing_downgrade_error());
			} finally {
				isProcessing = null;
			}
			return;
		}

		// If user is on Trial, switch immediately to Open
		if (currentPlan?.plan === 'trial') {
			isProcessing = 'open';
			try {
				await client.mutation(api.billing.mutations.switchToOpen, {});
				toast.success(m.pricing_switched_to_open());
			} catch (error) {
				console.error('Switch error:', error);
				toast.error(m.pricing_switch_error());
			} finally {
				isProcessing = null;
			}
			return;
		}

		// Default: redirect to plan page
		window.location.href = resolve('/plan') + '?upgrade=open';
	}

	async function handleSelectPrivate() {
		if (!isAuthenticated) {
			window.location.href = resolve('/signin') + '?redirect=/pricing&upgrade=private';
			return;
		}

		isProcessing = 'private';
		try {
			const result = await client.action(api.billing.actions.createCheckoutSession, {
				productSKU: selectedProduct.sku
			});

			if (result.checkoutUrl) {
				window.location.href = `${result.checkoutUrl}?theme=${currentTheme()}`;
			}
		} catch (error) {
			console.error('Checkout error:', error);
			toast.error(m.pricing_checkout_error());
		} finally {
			isProcessing = null;
		}
	}
</script>

<div class="flex flex-col gap-8">
	{#if !compact}
		<div class="text-center">
			<BillingToggle value={billingInterval} onchange={(v) => (billingInterval = v)} />
		</div>
	{/if}

	<!-- Scheduled Change Banner -->
	{#if currentPlan?.scheduledPlanChangeTo && currentPlan.currentPeriodEnd}
		<div class="mx-auto max-w-4xl w-full">
			<ScheduledChangeBanner
				scheduledChangeTo={currentPlan.scheduledPlanChangeTo}
				periodEndDate={currentPlan.currentPeriodEnd}
				onRevert={canManageBilling ? handleRevertScheduledChange : undefined}
				{isReverting}
				{canManageBilling}
			/>
		</div>
	{/if}

	<!-- Main Plans: Open & Private -->
	<div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
		<!-- Open Card -->
		<PricingCard
			name={PLAN_DEFINITIONS.open.name}
			subtitle={m.pricing_open_subtitle()}
			price={0}
			interval="forever"
			features={PLAN_DEFINITIONS.open.features}
			dataHandling={PLAN_DEFINITIONS.open.dataHandling}
			isCurrentPlan={isAuthenticated && currentPlan?.plan === 'open'}
			scheduledStatus={currentPlan?.scheduledPlanChangeTo === 'open' &&
			currentPlan?.currentPeriodEnd
				? m.pricing_scheduled_switch({ date: formatDate(currentPlan.currentPeriodEnd) })
				: undefined}
			buttonText={isProcessing === 'open'
				? m.upgrade_prompt_processing()
				: isAuthenticated && currentPlan?.plan === 'private'
					? m.pricing_switch_to_open()
					: isAuthenticated && currentPlan?.isLocked
						? m.pricing_continue_with_open()
						: m.pricing_start_with_open()}
			buttonHelper={isAuthenticated && !canManageBilling
				? m.billing_admin_required()
				: m.pricing_open_helper()}
			disabled={isProcessing !== null || (isAuthenticated && !canManageBilling)}
			onSelect={handleSelectOpen}
		/>

		<!-- Private Card -->
		<PricingCard
			name={PLAN_DEFINITIONS.private.name}
			subtitle={m.pricing_private_subtitle()}
			price={selectedProduct.price}
			priceNote={billingInterval === 'year'
				? m.pricing_yearly_note({ monthly: Math.round(selectedProduct.price / 12 / 100) })
				: undefined}
			interval={billingInterval}
			discount={selectedProduct.discount}
			features={PLAN_DEFINITIONS.private.features}
			trustCopy={m.pricing_private_trust_copy()}
			isCurrentPlan={isAuthenticated &&
				currentPlan?.plan === 'private' &&
				currentPlan?.interval === billingInterval}
			isRecommended={currentPlan?.plan !== 'private'}
			buttonText={isProcessing === 'private'
				? m.upgrade_prompt_processing()
				: isAuthenticated && currentPlan?.plan === 'private'
					? m.pricing_keep_private()
					: isAuthenticated && currentPlan?.plan === 'open'
						? m.pricing_switch_to_private()
						: isAuthenticated && currentPlan?.isLocked
							? m.pricing_continue_with_private()
							: m.pricing_start_private()}
			buttonHelper={isAuthenticated && !canManageBilling
				? m.billing_admin_required()
				: m.pricing_private_helper()}
			buttonVariant="primary"
			disabled={isProcessing !== null || (isAuthenticated && !canManageBilling)}
			onSelect={handleSelectPrivate}
			onCancel={canManageBilling && !currentPlan?.scheduledPlanChangeTo
				? handleCancelSubscription
				: undefined}
			{isCanceling}
			currentInterval={currentPlan?.plan === 'private' ? currentPlan.interval : undefined}
			selectedInterval={billingInterval}
			scheduledSwitchToMonthlyJobId={currentPlan?.scheduledSwitchToMonthlyJobId}
			currentPeriodEnd={currentPlan?.currentPeriodEnd}
			onSwitchToYearly={canManageBilling ? handleUpgradeToYearly : undefined}
			onSwitchToMonthly={canManageBilling ? handleRequestSwitchToMonthly : undefined}
			onRevertIntervalChange={canManageBilling ? handleRevertIntervalChange : undefined}
			{isSwitchingInterval}
		/>
	</div>

	<!-- Trial Fallback Section (Starter Plan) -->
	<!-- Show for: signed-out users OR signed-in users on trial (not for open/private/locked users) -->
	{#if !compact && (!isAuthenticated || currentPlan?.plan === 'trial') && !currentPlan?.isLocked}
		<div class="mx-auto w-full max-w-4xl">
			<div class="flex items-center gap-4">
				<div class="bg-surface-300-700 h-px flex-1"></div>
				<span class="text-surface-500 text-sm">{m.pricing_or()}</span>
				<div class="bg-surface-300-700 h-px flex-1"></div>
			</div>

			<div class="bg-surface-100-900 mt-4 rounded-container p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-start gap-4">
						<div
							class="bg-surface-200-800 flex size-10 shrink-0 items-center justify-center rounded-full"
						>
							<Hourglass class="text-surface-500 size-5" />
						</div>
						<div>
							{#if isAuthenticated && currentPlan?.plan === 'trial'}
								<!-- Signed-in user currently on trial -->
								<p class="font-semibold">{m.pricing_trial_active_title()}</p>
								<p class="text-surface-600-400 mt-1 text-sm">
									{m.pricing_trial_active_description()}
								</p>
							{:else}
								<!-- Signed-out user -->
								<p class="font-semibold">{m.pricing_trial_fallback_title()}</p>
								<p class="text-surface-600-400 mt-1 text-sm">
									{m.pricing_trial_fallback_description()}
								</p>
								<p class="text-surface-500 mt-3 text-xs">{m.pricing_trial_details()}</p>
							{/if}
						</div>
					</div>
					<div class="flex flex-col items-center gap-2 sm:items-end h-full">
						{#if isAuthenticated && currentPlan?.plan === 'trial'}
							<!-- Signed-in on trial: show subtle status indicator -->
							<div class="text-surface-500 flex items-center gap-2 text-sm">
								<span class="size-1.5 rounded-full bg-current"></span>
								<span>{m.pricing_trial_active()}</span>
							</div>
						{:else}
							<!-- Signed-out: show CTA -->
							<button
								type="button"
								class="btn preset-outlined-surface-500 shrink-0 w-full"
								disabled={isProcessing !== null}
								onclick={handleSelectTrial}
							>
								{m.pricing_start_trial()}
							</button>
							<p class="text-surface-500 text-xs">{m.pricing_trial_helper()}</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if !compact}
		<p class="text-surface-500 text-center text-sm">
			{m.pricing_cancel_anytime()}
		</p>
	{/if}
</div>
