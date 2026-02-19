<script lang="ts">
	import { StickyMobileCTA, FAQSection } from '$lib/landing/ui';
	import { PricingSection } from '$lib/billing/ui';
	import * as m from '$paraglide/messages';

	const faqItems = [
		{ question: m.landing_pricing_faq_1_q(), answer: m.landing_pricing_faq_1_a() },
		{ question: m.landing_pricing_faq_2_q(), answer: m.landing_pricing_faq_2_a() },
		{ question: m.landing_pricing_faq_3_q(), answer: m.landing_pricing_faq_3_a() },
		{ question: m.landing_pricing_faq_4_q(), answer: m.landing_pricing_faq_4_a() },
		{ question: m.landing_pricing_faq_5_q(), answer: m.landing_pricing_faq_5_a() }
	];
</script>

<svelte:head>
	<title>{m.landing_pricing_page_title()} | Plancreator</title>
</svelte:head>

<div>
	<StickyMobileCTA />

	<!-- Hero -->
	<section class="pt-16 sm:pt-24">
		<div class="mx-auto w-full max-w-320 px-8 py-8">
			<div class="mx-auto text-center">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					{m.landing_pricing_hero_title()}
				</h1>
				<p class="mx-auto mt-6 max-w-2xl text-lg text-surface-600-400">
					{m.landing_pricing_hero_subtitle()}
				</p>
			</div>
		</div>
	</section>

	<!-- Pricing Cards -->
	<section>
		<div class="mx-auto w-full max-w-320 px-8 py-8 sm:py-16">
			<div class="mx-auto max-w-5xl">
				<PricingSection />
			</div>
		</div>
	</section>

	<FAQSection title={m.landing_pricing_faq_title()} items={faqItems} />
</div>
