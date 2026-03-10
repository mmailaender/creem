# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-02-05

### Added

- **Type Exports**: All types are now exported from the package root. Import directly: `import { Customer, Product, Subscription } from 'creem_io'`
- **Pause/Resume Subscription Methods**: New `subscriptions.pause()` and `subscriptions.resume()` methods for subscription lifecycle management
- **Scheduled Cancel Webhook**: Added `onSubscriptionScheduledCancel` handler for `subscription.scheduled_cancel` events

## [0.4.0] - Previous Release

Initial public release.
