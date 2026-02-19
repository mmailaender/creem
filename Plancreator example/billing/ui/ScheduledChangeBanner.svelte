<script lang="ts">
	// Icons
	import { CalendarIcon, InfoIcon } from '@lucide/svelte';
	// i18n
	import * as m from '$paraglide/messages';

	type Props = {
		scheduledChangeTo: 'open' | 'none';
		periodEndDate: number;
		onRevert?: () => void;
		isReverting?: boolean;
		canManageBilling?: boolean;
	};

	let {
		scheduledChangeTo,
		periodEndDate,
		onRevert,
		isReverting = false,
		canManageBilling = true
	}: Props = $props();

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('default', {
			dateStyle: 'medium'
		}).format(new Date(timestamp));
	}

	// Banner A: Cancellation scheduled (access will end)
	// Banner B: Switched to Open (data handling changed)
	const isCancellation = $derived(scheduledChangeTo === 'none');
</script>

{#if isCancellation}
	<!-- Banner A: Cancellation Scheduled - Warning style -->
	<div
		class="bg-warning-100-900 border-warning-300-700 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-start gap-3 sm:items-center">
			<CalendarIcon class="text-warning-600-400 mt-0.5 size-5 shrink-0 sm:mt-0" />
			<div>
				<p class="font-medium">
					{m.billing_cancellation_title({ date: formatDate(periodEndDate) })}
				</p>
				<p class="text-surface-600-400 text-sm">
					{m.billing_cancellation_description()}
				</p>
			</div>
		</div>

		{#if onRevert}
			<button
				type="button"
				class="btn preset-filled-warning-500 shrink-0"
				disabled={isReverting}
				onclick={onRevert}
			>
				{isReverting ? m.billing_reverting() : m.billing_keep_private()}
			</button>
		{:else if !canManageBilling}
			<p class="text-surface-500 text-sm">{m.billing_admin_required()}</p>
		{/if}
	</div>
{:else}
	<!-- Banner B: Switched to Open - Informational style -->
	<div
		class="bg-surface-100-900 border-surface-300-700 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-start gap-3 sm:items-center">
			<InfoIcon class="text-primary-500 mt-0.5 size-5 shrink-0 sm:mt-0" />
			<div>
				<p class="font-medium">
					{m.billing_switched_to_open_title({ date: formatDate(periodEndDate) })}
				</p>
				<p class="text-surface-600-400 text-sm">
					{m.billing_switched_to_open_description({ date: formatDate(periodEndDate) })}
				</p>
			</div>
		</div>

		{#if onRevert}
			<button
				type="button"
				class="btn preset-outlined-primary-500 shrink-0"
				disabled={isReverting}
				onclick={onRevert}
			>
				{isReverting ? m.billing_reverting() : m.billing_switch_back_to_private()}
			</button>
		{:else if !canManageBilling}
			<p class="text-surface-500 text-sm">{m.billing_admin_required()}</p>
		{/if}
	</div>
{/if}
