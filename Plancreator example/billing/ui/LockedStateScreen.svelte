<script lang="ts">
	// Icons
	import { LockIcon } from '@lucide/svelte';
	// Components
	import PricingSection from './PricingSection.svelte';
	// i18n
	import * as m from '$paraglide/messages';
</script>

<div class="flex min-h-[calc(100vh-var(--header-height))] flex-col items-center justify-center p-4">
	<div class="w-full max-w-4xl">
		<div class="mb-6 flex items-center justify-center gap-3">
			<div class="bg-warning-100-900 flex size-10 items-center justify-center rounded-full">
				<LockIcon class="text-warning-500 size-5" />
			</div>
			<div>
				<h1 class="text-xl font-semibold">{m.billing_locked_title()}</h1>
				<p class="text-surface-600-400 text-sm">{m.billing_locked_description()}</p>
			</div>
		</div>

		<PricingSection compact />
	</div>
</div>
