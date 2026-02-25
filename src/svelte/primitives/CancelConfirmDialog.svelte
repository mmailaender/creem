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
        class="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <Dialog.Title class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Cancel subscription?
        </Dialog.Title>
        <Dialog.Description class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Are you sure you want to cancel your subscription? You will continue to
          have access until the end of your current billing period.
        </Dialog.Description>

        <div class="mt-6 flex justify-end gap-3">
          <Dialog.CloseTrigger
            class="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            disabled={isLoading}
          >
            Keep subscription
          </Dialog.CloseTrigger>
          <button
            type="button"
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            disabled={isLoading}
            onclick={() => onConfirm?.()}
          >
            {isLoading ? "Canceling..." : "Yes, cancel"}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
