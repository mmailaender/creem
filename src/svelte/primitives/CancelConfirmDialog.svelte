<script lang="ts">
  /* global $props */
  import { Dialog } from "@ark-ui/svelte/dialog";
  import { Portal } from "@ark-ui/svelte/portal";

  interface Props {
    open: boolean;
    isLoading?: boolean;
    onOpenChange?: (open: boolean) => void;
    onConfirm?: () => void;
  }

  let {
    open = false,
    isLoading = false,
    onOpenChange,
    onConfirm,
  }: Props = $props();
</script>

<Dialog.Root
  {open}
  onOpenChange={(details: { open: boolean }) => onOpenChange?.(details.open)}
  closeOnInteractOutside={!isLoading}
  closeOnEscapeKeyDown={!isLoading}
>
  <Portal>
    <Dialog.Backdrop
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out"
    />
    <Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Dialog.Content
        class="relative w-full max-w-[24rem] rounded-xl bg-surface-base p-6 shadow-xl"
      >
        <Dialog.CloseTrigger
          class="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-s text-foreground-muted transition hover:text-foreground-default disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          aria-label="Close dialog"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="h-4 w-4">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Dialog.CloseTrigger>

        <Dialog.Title class="title-l text-foreground-default">
          Cancel subscription?
        </Dialog.Title>
        <Dialog.Description class="body-m mt-6 text-foreground-muted">
          Are you sure you want to cancel your subscription? You will continue to
          have access until the end of your current billing period.
        </Dialog.Description>

        <div class="flex flex-col items-end gap-2 pt-8">
          <button
            type="button"
            class="button-filled h-8 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onclick={() => onConfirm?.()}
          >
            {isLoading ? "Canceling..." : "Yes, cancel"}
          </button>
          <Dialog.CloseTrigger
            class="button-faded h-8 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          >
            Keep subscription
          </Dialog.CloseTrigger>
        </div>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
