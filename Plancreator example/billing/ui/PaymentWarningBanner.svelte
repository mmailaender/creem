<script lang="ts">
	// Icons
	import { AlertTriangleIcon, XIcon } from '@lucide/svelte';
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
		customerId: string;
		onDismiss?: () => void;
	};

	let { customerId, onDismiss }: Props = $props();

	const client = useConvexClient();
	const roles = useRoles();
	const canManageBilling = $derived(roles.hasOwnerOrAdminRole);
	let isLoading = $state(false);

	async function handleUpdatePayment() {
		isLoading = true;
		try {
			const result = await client.action(api.billing.actions.getBillingPortalUrl, {
				customerId
			});

			if (result.portalUrl) {
				window.location.href = result.portalUrl;
			} else {
				toast.error(m.billing_portal_error());
			}
		} catch (error) {
			console.error('Failed to get billing portal URL:', error);
			toast.error(m.billing_portal_error());
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="bg-warning-100-900 border-warning-300-700 flex items-center justify-between gap-4 border-b px-4 py-3"
>
	<div class="flex items-center gap-3">
		<AlertTriangleIcon class="text-warning-600-400 size-5 shrink-0" />
		<p class="text-sm font-medium">{m.billing_payment_warning()}</p>
	</div>

	<div class="flex items-center gap-2">
		{#if canManageBilling}
			<button
				type="button"
				class="btn btn-sm preset-filled-warning-500"
				disabled={isLoading}
				onclick={handleUpdatePayment}
			>
				{isLoading ? m.billing_loading() : m.billing_update_payment()}
			</button>
		{:else}
			<span class="text-warning-600-400 text-sm">{m.billing_contact_admin()}</span>
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
