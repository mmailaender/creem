<script lang="ts">
	import { Check } from '@lucide/svelte';
	import * as m from '$paraglide/messages';

	type Feature = {
		key: string;
		included: boolean;
	};

	type DataHandling = {
		title: string;
		points: string[];
	};

	type Props = {
		name: string;
		subtitle: string;
		price: number;
		priceNote?: string;
		interval?: 'month' | 'year' | 'forever';
		discount?: string;
		features: Feature[];
		dataHandling?: DataHandling;
		trustCopy?: string;
		isCurrentPlan?: boolean;
		isRecommended?: boolean;
		buttonText?: string;
		buttonHelper?: string;
		buttonVariant?: 'primary' | 'secondary';
		disabled?: boolean;
		onSelect?: () => void;
		onCancel?: () => void;
		isCanceling?: boolean;
		scheduledStatus?: string;
		currentInterval?: 'month' | 'year' | null;
		selectedInterval?: 'month' | 'year';
		scheduledSwitchToMonthlyJobId?: string | null;
		currentPeriodEnd?: number | null;
		onSwitchToYearly?: () => void;
		onSwitchToMonthly?: () => void;
		onRevertIntervalChange?: () => void;
		isSwitchingInterval?: boolean;
	};

	let {
		name,
		subtitle,
		price,
		priceNote,
		interval,
		discount,
		features,
		dataHandling,
		trustCopy,
		isCurrentPlan = false,
		isRecommended = false,
		buttonText,
		buttonHelper,
		buttonVariant = 'secondary',
		disabled = false,
		onSelect,
		onCancel,
		isCanceling = false,
		scheduledStatus,
		currentInterval,
		selectedInterval,
		scheduledSwitchToMonthlyJobId,
		currentPeriodEnd,
		onSwitchToYearly,
		onSwitchToMonthly,
		onRevertIntervalChange,
		isSwitchingInterval = false
	}: Props = $props();

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('default', {
			dateStyle: 'medium'
		}).format(new Date(timestamp));
	}

	const isOnPrivatePlan = $derived(currentInterval != null);
	const isIntervalMismatch = $derived(isOnPrivatePlan && currentInterval !== selectedInterval);

	const canSwitchInterval = $derived(
		isOnPrivatePlan &&
			selectedInterval &&
			currentInterval !== selectedInterval &&
			!scheduledSwitchToMonthlyJobId
	);

	const isUpgradeToYearly = $derived(currentInterval === 'month' && selectedInterval === 'year');
	const isDowngradeToMonthly = $derived(currentInterval === 'year' && selectedInterval === 'month');

	function formatPrice(cents: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(cents / 100);
	}

	function getFeatureLabel(key: string): string {
		const labels: Record<string, string> = {
			// Open features
			full_chat_planning: m.pricing_feature_full_chat_planning(),
			all_decision_profiles: m.pricing_feature_all_decision_profiles(),
			document_export: m.pricing_feature_document_export(),
			progress_tracking: m.pricing_feature_progress_tracking(),
			// Private features
			everything_in_open: m.pricing_feature_everything_in_open(),
			plan_never_shared: m.pricing_feature_plan_never_shared(),
			no_partner_access: m.pricing_feature_no_partner_access(),
			priority_support: m.pricing_feature_priority_support()
		};
		return labels[key] ?? key;
	}

	function getDataHandlingLabel(key: string): string {
		const labels: Record<string, string> = {
			open_data_anonymized: m.pricing_open_data_anonymized(),
			open_data_check_help: m.pricing_open_data_check_help(),
			open_data_expert_offers: m.pricing_open_data_expert_offers(),
			open_data_no_public: m.pricing_open_data_no_public(),
			open_data_no_ads: m.pricing_open_data_no_ads(),
			open_data_no_resale: m.pricing_open_data_no_resale()
		};
		return labels[key] ?? key;
	}
</script>

<div
	class="relative flex h-full flex-col rounded-2xl p-6 pt-4 {isRecommended
		? 'border-primary-200-800 border bg-primary-500/5'
		: 'border-surface-200-800 bg-surface-100-900'}"
>
	<div class="mb-4">
		<div class="flex items-center gap-1.5">
			<h3 class="text-lg font-bold">{name}</h3>
			{#if isRecommended && !isCurrentPlan}
				<div
					class="bg-primary-50-950 text-primary-900-100 rounded-full px-3 py-1 text-xs font-medium"
				>
					{m.pricing_recommended()}
				</div>
			{/if}
		</div>
		<p
			class={`mt-1 mb-2 text-sm ${isRecommended ? 'text-primary-950-50/80' : 'text-surface-600-400'}`}
		>
			{subtitle}
		</p>
	</div>

	<div class="mb-2 min-h-20">
		<div class="flex items-baseline gap-1">
			<span class="text-4xl font-bold">{formatPrice(price)}</span>
			{#if interval}
				<span class={`${isRecommended ? 'text-primary-950-50/80' : 'text-surface-600-400'}`}
					>/{interval === 'month'
						? m.pricing_per_month()
						: interval === 'year'
							? m.pricing_per_year()
							: m.pricing_forever()}</span
				>
			{/if}
		</div>
		{#if priceNote}
			<p
				class={` mt-1 text-sm ${isRecommended ? 'text-primary-950-50/80' : 'text-surface-600-400'}`}
			>
				-{discount} • {priceNote}
			</p>
		{/if}
	</div>

	<div>
		{#if isCurrentPlan}
			<!-- Current plan indicator (interval matches) -->
			<div class="flex flex-col gap-2">
				<div
					class="text-primary-500 h-16 flex items-start justify-center gap-2 py-2 text-sm font-medium"
				>
					<span>{m.pricing_current_plan()}</span>
				</div>

				<!-- Scheduled switch to monthly banner -->
				{#if scheduledSwitchToMonthlyJobId && currentPeriodEnd}
					<div class="bg-warning-500/10 border-warning-500/30 rounded-lg border p-3 text-sm">
						<p class="text-warning-600 dark:text-warning-400">
							{m.billing_interval_change_scheduled({
								interval: m.pricing_per_month(),
								date: formatDate(currentPeriodEnd)
							})}
						</p>
						{#if onRevertIntervalChange}
							<button
								type="button"
								class="text-warning-700 dark:text-warning-300 mt-2 text-xs underline hover:no-underline"
								disabled={isSwitchingInterval}
								onclick={onRevertIntervalChange}
							>
								{isSwitchingInterval ? m.billing_loading() : m.billing_revert_interval_change()}
							</button>
						{/if}
					</div>
				{/if}

				{#if onCancel && !scheduledSwitchToMonthlyJobId}
					<button
						type="button"
						class="btn preset-outlined-surface-500 w-full text-sm"
						disabled={isCanceling}
						onclick={onCancel}
					>
						{isCanceling ? m.billing_loading() : m.pricing_cancel_subscription()}
					</button>
				{/if}
			</div>
		{:else if isIntervalMismatch && canSwitchInterval}
			<!-- User is on private but viewing different interval - show switch button -->
			<div class="flex flex-col gap-2">
				{#if isUpgradeToYearly && onSwitchToYearly}
					<button
						type="button"
						class="btn preset-filled-primary-500 w-full text-sm"
						disabled={isSwitchingInterval}
						onclick={onSwitchToYearly}
					>
						{isSwitchingInterval ? m.billing_loading() : m.billing_upgrade_to_yearly()}
					</button>
					<p class="text-surface-500 text-center text-xs">
						{m.billing_upgrade_yearly_note()}
					</p>
				{:else if isDowngradeToMonthly && onSwitchToMonthly}
					<button
						type="button"
						class="btn preset-outlined-surface-500 w-full text-sm"
						disabled={isSwitchingInterval}
						onclick={onSwitchToMonthly}
					>
						{isSwitchingInterval ? m.billing_loading() : m.billing_switch_to_monthly()}
					</button>
					<p class="text-surface-500 text-center text-xs">
						{m.billing_switch_monthly_note()}
					</p>
				{/if}
			</div>
		{:else if scheduledStatus}
			<!-- Scheduled status indicator -->
			<div class="text-surface-500 flex items-center justify-center gap-2 py-3 text-sm">
				<span class="size-1.5 rounded-full bg-current"></span>
				<span>{scheduledStatus}</span>
			</div>
		{:else if onSelect}
			<button
				type="button"
				class="btn w-full py-3 {buttonVariant === 'primary'
					? 'preset-filled-primary-500'
					: 'preset-outlined-surface-950-50 hover:preset-filled-surface-950-50'}"
				{disabled}
				onclick={onSelect}
			>
				{buttonText ?? m.pricing_select_plan()}
			</button>
			{#if buttonHelper}
				<p class="text-surface-800-200/75 mt-2 text-center text-xs">{buttonHelper}</p>
			{/if}
		{/if}
	</div>

	<ul class="my-12 space-y-3">
		{#each features as feature (feature.key)}
			<li class="flex items-center gap-2">
				<Check class="text-surface-950-50/70 mt-0.5  size-4 shrink-0" />
				<span class="text-sm">{getFeatureLabel(feature.key)}</span>
			</li>
		{/each}
	</ul>

	<!-- Data Handling Section (for Open plan) -->
	{#if dataHandling}
		<div class="bg-surface-200-800 rounded-container p-4">
			<p class="mb-3 text-sm font-semibold">{m.pricing_open_data_title()}</p>
			<ul class="space-y-2 text-sm">
				{#each dataHandling.points as point (point)}
					<li class="text-surface-600-400 flex items-start gap-2">
						<span class="text-surface-500">•</span>
						<span>{getDataHandlingLabel(point)}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Trust Copy Section (for Private plan) -->
	{#if trustCopy}
		<div class="flex items-start h-full">
			<div class="bg-primary-100-900/60 rounded-container p-4">
				<p class="text-primary-700-300 text-sm">{trustCopy}</p>
			</div>
		</div>
	{/if}
</div>
