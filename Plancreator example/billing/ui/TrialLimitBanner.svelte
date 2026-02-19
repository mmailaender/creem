<script lang="ts">
	import { Sparkles } from '@lucide/svelte';
	import * as m from '$paraglide/messages';
	import * as Dialog from '$lib/primitives/ui/dialog';
	import PricingSection from './PricingSection.svelte';

	let dialogOpen = $state(false);
</script>

<div
	class="bg-primary-100-900 border-primary-300-700 flex items-center justify-between gap-4 border-b px-4 py-3"
>
	<div class="flex items-center gap-3">
		<Sparkles class="text-primary-600-400 size-5 shrink-0" />
		<p class="text-sm font-medium">{m.billing_trial_limit_reached()}</p>
	</div>

	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Trigger>
			<button type="button" class="btn btn-sm preset-filled-primary-500">
				{m.billing_upgrade_now()}
			</button>
		</Dialog.Trigger>
		<Dialog.Backdrop />
		<Dialog.Content class="max-w-4xl">
			<Dialog.CloseX />
			<Dialog.Header>
				<Dialog.Title>{m.pricing_choose_your_plan()}</Dialog.Title>
			</Dialog.Header>
			<PricingSection />
		</Dialog.Content>
	</Dialog.Root>
</div>
