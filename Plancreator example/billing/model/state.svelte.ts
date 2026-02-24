/**
 * Billing State
 *
 * Shared reactive state for billing context using Svelte 5 runes.
 * Used by BillingGate (writes) and child components like ChatInput (reads).
 */

// Shared state object - exported as object so it stays reactive across modules
export const billingState = $state({
  isReadOnly: false,
});
