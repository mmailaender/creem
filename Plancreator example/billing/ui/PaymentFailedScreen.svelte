<script lang="ts">
	// Icons
	import { AlertTriangleIcon } from '@lucide/svelte';
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
	};

	let { customerId }: Props = $props();

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
				window.open(result.portalUrl, '_blank');
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

<div class="flex min-h-[calc(100vh-var(--header-height))] flex-col items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="card border border-surface-300-700 p-6">
			<div class="mb-4 flex items-center gap-3">
				<div class="bg-error-100-900 flex size-10 items-center justify-center rounded-full">
					<AlertTriangleIcon class="text-error-500 size-5" />
				</div>
				<h1 class="text-xl font-bold">{m.billing_payment_failed_title()}</h1>
			</div>

			<p class="text-surface-600-400 mb-6">{m.billing_payment_failed_description()}</p>

			{#if canManageBilling}
				<button
					type="button"
					class="btn preset-filled-primary-500 w-full"
					disabled={isLoading}
					onclick={handleUpdatePayment}
				>
					{isLoading ? m.billing_loading() : m.billing_update_payment()}
				</button>

				<p class="text-surface-500 mt-4 text-center text-xs">
					{m.billing_payment_failed_note()}
				</p>
			{:else}
				<div class="bg-surface-100-900 rounded-lg p-4 text-center">
					<p class="text-surface-600-400 text-sm">{m.billing_contact_admin_to_fix()}</p>
				</div>
			{/if}
		</div>
	</div>
</div>
