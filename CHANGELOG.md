# Changelog

## 0.1.0

- Initial npm release of `@mmailaender/convex-creem`.
- Convex component for Creem billing:
  - Webhook sync engine (customers, subscriptions, orders, products).
  - `creem.api({ resolve })` convenience exports for common billing flows.
  - Resource namespaces for direct API access (`creem.subscriptions.*`,
    `creem.checkouts.*`, `creem.products.*`, `creem.customers.*`,
    `creem.orders.*`).
- Billing UI helpers:
  - React widgets/primitives (`./react` export).
  - Svelte 5 widgets/primitives (`./svelte` export).
  - Shared styles export (`./styles`).
