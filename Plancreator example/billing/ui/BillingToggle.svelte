<script lang="ts">
	import * as m from '$paraglide/messages';

	type Props = {
		value: 'month' | 'year';
		onchange: (value: 'month' | 'year') => void;
	};

	let { value, onchange }: Props = $props();
</script>

<div class="bg-surface-100-900 inline-flex rounded-container p-1">
	<button
		type="button"
		class="btn {value === 'month'
			? 'preset-filled-surface-50-950 shadow hover:!brightness-100'
			: 'hover:preset-tonal'}"
		onclick={() => onchange('month')}
	>
		{m.pricing_monthly()}
	</button>
	<button
		type="button"
		class="btn {value === 'year'
			? 'preset-filled-surface-50-950 shadow hover:!brightness-100'
			: 'hover:preset-tonal'}"
		onclick={() => onchange('year')}
	>
		{m.pricing_yearly()}
		<span class="badge preset-tonal-primary">-20%</span>
	</button>
</div>
