<script lang="ts">
  export let name: string;
  export let price: string;
  export let billingSuffix: string;
  export let description: string;
  export let ctaLabel: string;
  export let includedTitle: string;
  export let features: string[] = [];
  export let helpText: string;
  export let isRecommended = false;
  export let trialLabel: string | null = null;
  export let currentPlan = false;
  export let disabled = false;
  export let onAction: (() => void | Promise<void>) | undefined = undefined;

  // Phosphor Icons: check-bold
  const CHECK_ICON_URL = "https://files.svgcdn.io/ph/check-bold.svg";
</script>

<article class="relative isolate flex flex-col gap-1">
  {#if isRecommended}
    <div
      class="pointer-events-none absolute left-0 top-[-32px] z-0 flex h-[106px] w-full items-start justify-center rounded-xl px-[11px] py-2 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)] bg-[linear-gradient(179.55deg,#516EFA_12.8%,#304194_59.27%)]"
    >
      <span class="label-s tracking-[0.66px] text-[#FAFAFA]">RECOMMENDED</span>
    </div>
  {/if}

  <section class="surface-base radius-xl relative z-10 flex flex-col gap-4 p-6">
    <h3 class="title-m text-foreground-default">{name}</h3>
    <div class="flex items-baseline gap-1">
      <span class="heading-l text-foreground-default">{price}</span>
      <span class="title-s text-foreground-placeholder">{billingSuffix}</span>
    </div>
    <p class="body-m min-h-10 text-foreground-muted">{description}</p>
    {#if trialLabel}
      <span
        class="inline-flex w-fit rounded-md bg-sky-100 px-3 py-2 text-sm font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
      >
        {trialLabel}
      </span>
    {:else if currentPlan}
      <span
        class="inline-flex w-fit rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      >
        Current plan
      </span>
    {:else}
      <button
        class={isRecommended ? "button-filled w-full" : "button-faded w-full"}
        type="button"
        {disabled}
        on:click={onAction}
      >
        {ctaLabel}
      </button>
    {/if}
  </section>

  <section class="surface-base radius-xl relative z-10 flex min-h-[344px] flex-col gap-4 p-6">
    <h4 class="title-s text-foreground-default">{includedTitle}</h4>
    <ul class="flex flex-1 flex-col gap-2 pb-10">
      {#each features as feature}
        <li class="flex items-center gap-2">
          <span class="inline-flex h-5 w-5 items-center justify-center">
            <img alt="" aria-hidden="true" class="h-4 w-4" src={CHECK_ICON_URL} />
          </span>
          <span class="body-m text-foreground-default">{feature}</span>
        </li>
      {/each}
    </ul>
    <p class="label-s text-foreground-muted">{helpText}</p>
  </section>
</article>
