<script lang="ts">
	// Icons
	import { CalendarIcon, InfoIcon, XIcon } from '@lucide/svelte';
	// Primitives
	import { toast } from 'svelte-sonner';
	// i18n
	import * as m from '$paraglide/messages';
	// Convex
	import { useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	// API
	import { useRoles } from '$lib/organizations/api/roles.svelte';

	type Props = {
		scheduledChangeTo: 'open' | 'none';
		periodEndDate: number;
		subscriptionId: string;
		onDismiss?: () => void;
	};

	let { scheduledChangeTo, periodEndDate, subscriptionId, onDismiss }: Props = $props();

	const client = useConvexClient();
	const roles = useRoles();
	const canManageBilling = $derived(roles.hasOwnerOrAdminRole);
	let isReverting = $state(false);

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('default', {
			dateStyle: 'medium'
		}).format(new Date(timestamp));
	}

	async function handleRevert() {
		isReverting = true;
		try {
			// Call Creem API via action to reactivate subscription
			await client.action(api.billing.actions.reactivateSubscription, {
				subscriptionId
			});
			toast.success(m.billing_change_reverted());
		} catch (error) {
			console.error('Revert error:', error);
			toast.error(m.billing_revert_error());
		} finally {
			isReverting = false;
		}
	}

	const isCancellation = $derived(scheduledChangeTo === 'none');
</script>

{#if isCancellation}
	<!-- Cancellation scheduled - Warning style -->
	<div
		class="bg-warning-100-900 border-warning-300-700 flex items-center justify-between gap-4 border-b px-4 py-3"
	>
		<div class="flex items-center gap-3">
			<CalendarIcon class="text-warning-600-400 size-5 shrink-0" />
			<p class="text-sm">
				<span class="font-medium"
					>{m.billing_app_cancellation_title({ date: formatDate(periodEndDate) })}</span
				>
			</p>
		</div>

		<div class="flex items-center gap-2">
			{#if canManageBilling}
				<button
					type="button"
					class="btn btn-sm preset-filled-warning-500"
					disabled={isReverting}
					onclick={handleRevert}
				>
					{isReverting ? m.billing_reverting() : m.billing_keep_private()}
				</button>
			{:else}
				<span class="text-warning-600-400 text-sm">{m.billing_admin_required()}</span>
			{/if}

			{#if onDismiss}
				<button
					type="button"
					class="text-warning-600-400 hover:text-warning-700-300 p-1"
					onclick={onDismiss}
					aria-label={m.billing_dismiss()}
				>
					<XIcon class="size-4" />
				</button>
			{/if}
		</div>
	</div>
{:else}
	<!-- Switching to Open - Info style -->
	<div
		class="bg-surface-100-900 border-surface-300-700 flex items-center justify-between gap-4 border-b px-4 py-3"
	>
		<div class="flex items-center gap-3">
			<InfoIcon class="text-primary-500 size-5 shrink-0" />
			<p class="text-sm">
				<span class="font-medium"
					>{m.billing_app_switch_to_open_title({ date: formatDate(periodEndDate) })}</span
				>
			</p>
		</div>

		<div class="flex items-center gap-2">
			{#if canManageBilling}
				<button
					type="button"
					class="btn btn-sm preset-outlined-primary-500"
					disabled={isReverting}
					onclick={handleRevert}
				>
					{isReverting ? m.billing_reverting() : m.billing_switch_back_to_private()}
				</button>
			{:else}
				<span class="text-surface-500 text-sm">{m.billing_admin_required()}</span>
			{/if}

			{#if onDismiss}
				<button
					type="button"
					class="text-surface-500 hover:text-surface-600-400 p-1"
					onclick={onDismiss}
					aria-label={m.billing_dismiss()}
				>
					<XIcon class="size-4" />
				</button>
			{/if}
		</div>
	</div>
{/if}
