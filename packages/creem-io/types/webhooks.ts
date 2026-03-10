/**
 * Creem Webhook Types
 *
 * This file contains all TypeScript types needed to work with Creem webhooks.
 * It's designed to be framework-agnostic and fully type-safe.
 *
 * No external dependencies required - just TypeScript!
 */

import type { Checkout, NestedSubscriptionInCheckout, NormalizedCheckout } from "./checkout";
import type { Customer } from "./customer";
import type { Product } from "./products";
import type { NormalizedSubscription, Subscription } from "./subscriptions";
import type { Transaction } from "./transactions";

// ============================================================================
// REFUND TYPES
// ============================================================================

/**
 * Refund entity
 */
export interface Refund {
  /** String representing the object's type */
  object: "refund";
  /** Unique identifier for the object */
  id: string;
  /** Environment mode: test, prod, or sandbox */
  mode: "test" | "prod" | "sandbox";
  /** Status of the refund */
  status: "pending" | "succeeded" | "canceled" | "failed";
  /** The refunded amount in cents. 1000 = $10.00 */
  refundAmount: number;
  /** Three-letter ISO currency code, in uppercase */
  refundCurrency: string;
  /** Reason for the refund */
  reason: "duplicate" | "fraudulent" | "requested_by_customer" | "other";
  /** The transaction associated with the refund */
  transaction: Transaction;
  /** The checkout associated with the refund */
  checkout?: Checkout | string;
  /** The order associated with the refund */
  order?: string;
  /** The subscription associated with the refund */
  subscription?: Subscription | string;
  /** The customer associated with the refund */
  customer?: Customer | string;
  /** Creation date as timestamp */
  createdAt: number;
}

/**
 * Normalized refund entity with expanded relations
 */
export interface NormalizedRefund extends Omit<Refund, "transaction"> {
  /** The transaction is always expanded */
  transaction: Transaction;
}

// ============================================================================
// DISPUTE TYPES
// ============================================================================

/**
 * Dispute entity
 */
export interface Dispute {
  /** String representing the object's type */
  object: "dispute";
  /** Unique identifier for the object */
  id: string;
  /** Environment mode: test, prod, or sandbox */
  mode: "test" | "prod" | "sandbox";
  /** The disputed amount in cents. 1000 = $10.00 */
  amount: number;
  /** Three-letter ISO currency code, in uppercase */
  currency: string;
  /** The transaction associated with the dispute */
  transaction: Transaction;
  /** The checkout associated with the dispute */
  checkout?: Checkout | string;
  /** The order associated with the dispute */
  order?: string;
  /** The subscription associated with the dispute */
  subscription?: Subscription | string;
  /** The customer associated with the dispute */
  customer?: Customer | string;
  /** Creation date as timestamp */
  createdAt: number;
}

/**
 * Normalized dispute entity with expanded relations
 */
export interface NormalizedDispute extends Omit<Dispute, "transaction"> {
  /** The transaction is always expanded */
  transaction: Transaction;
}

// Re-export types for convenience
export type {
  Checkout,
  Customer,
  NestedSubscriptionInCheckout,
  NormalizedCheckout,
  NormalizedSubscription,
  Product,
  Subscription,
  Transaction,
};

// ============================================================================
// WEBHOOK EVENT TYPES
// ============================================================================

/**
 * Base webhook event structure (as received from API with snake_case)
 */
export interface WebhookEvent<TType extends string = string, TData = unknown> {
  /** Unique webhook event ID */
  id: string;
  /** Webhook event type */
  eventType: TType;
  /** Webhook event creation timestamp (snake_case from API) */
  created_at: number;
  /** The webhook event data */
  object: TData;
}

/**
 * Checkout completed event callback parameter.
 * All properties are at the top level for easy destructuring.
 */
export type CheckoutCompletedEvent = {
  /** Webhook event type identifier */
  webhookEventType: "checkout.completed";
  /** Unique webhook event ID */
  webhookId: string;
  /** Webhook event creation timestamp */
  webhookCreatedAt: number;
} & NormalizedCheckout;

/**
 * Refund created event callback parameter.
 */
export type RefundCreatedEvent = {
  /** Webhook event type identifier */
  webhookEventType: "refund.created";
  /** Unique webhook event ID */
  webhookId: string;
  /** Webhook event creation timestamp */
  webhookCreatedAt: number;
} & NormalizedRefund;

/**
 * Dispute created event callback parameter.
 */
export type DisputeCreatedEvent = {
  /** Webhook event type identifier */
  webhookEventType: "dispute.created";
  /** Unique webhook event ID */
  webhookId: string;
  /** Webhook event creation timestamp */
  webhookCreatedAt: number;
} & NormalizedDispute;

/**
 * Subscription event callback parameter.
 */
export type SubscriptionEvent<T extends string> = {
  /** Webhook event type identifier */
  webhookEventType: T;
  /** Unique webhook event ID */
  webhookId: string;
  /** Webhook event creation timestamp */
  webhookCreatedAt: number;
} & NormalizedSubscription;

// ============================================================================
// ACCESS CONTROL TYPES
// ============================================================================

/**
 * Reasons for granting access
 */
export type GrantAccessReason =
  | "subscription_active"
  | "subscription_trialing"
  | "subscription_paid";

/**
 * Reasons for revoking access
 */
export type RevokeAccessReason = "subscription_paused" | "subscription_expired";

/**
 * Context passed to onGrantAccess callback.
 * All subscription properties are flattened for easy destructuring.
 */
export type GrantAccessContext = {
  /** The reason for granting access */
  reason: GrantAccessReason;
} & NormalizedSubscription;

/**
 * Context passed to onRevokeAccess callback.
 * All subscription properties are flattened for easy destructuring.
 */
export type RevokeAccessContext = {
  /** The reason for revoking access */
  reason: RevokeAccessReason;
} & NormalizedSubscription;

// ============================================================================
// WEBHOOK HANDLER TYPES
// ============================================================================

/**
 * Webhook configuration options
 */
export interface WebhookOptions {
  /**
   * Creem Webhook Secret (for signature verification)
   * @required
   */
  webhookSecret: string;

  /**
   * Called when a checkout is completed.
   * All properties are flattened for easy destructuring.
   *
   * @example
   * onCheckoutCompleted: async ({ webhookEventType, product, customer, order, subscription }) => {
   *   console.log(`Checkout completed: ${customer?.email} purchased ${product.name}`);
   * }
   */
  onCheckoutCompleted?: (data: CheckoutCompletedEvent) => void | Promise<void>;

  /**
   * Called when a refund is created.
   */
  onRefundCreated?: (data: RefundCreatedEvent) => void | Promise<void>;

  /**
   * Called when a dispute is created.
   */
  onDisputeCreated?: (data: DisputeCreatedEvent) => void | Promise<void>;

  /**
   * Called when a subscription becomes active.
   *
   * @example
   * onSubscriptionActive: async ({ product, customer, status }) => {
   *   console.log(`${customer.email} subscribed to ${product.name}`);
   * }
   */
  onSubscriptionActive?: (data: SubscriptionEvent<"subscription.active">) => void | Promise<void>;

  /**
   * Called when a subscription is in trialing state.
   */
  onSubscriptionTrialing?: (
    data: SubscriptionEvent<"subscription.trialing">,
  ) => void | Promise<void>;

  /**
   * Called when a subscription is canceled.
   */
  onSubscriptionCanceled?: (
    data: SubscriptionEvent<"subscription.canceled">,
  ) => void | Promise<void>;

  /**
   * Called when a subscription is paid.
   */
  onSubscriptionPaid?: (data: SubscriptionEvent<"subscription.paid">) => void | Promise<void>;

  /**
   * Called when a subscription has expired.
   */
  onSubscriptionExpired?: (data: SubscriptionEvent<"subscription.expired">) => void | Promise<void>;

  /**
   * Called when a subscription is unpaid.
   */
  onSubscriptionUnpaid?: (data: SubscriptionEvent<"subscription.unpaid">) => void | Promise<void>;

  /**
   * Called when a subscription is updated.
   */
  onSubscriptionUpdate?: (data: SubscriptionEvent<"subscription.update">) => void | Promise<void>;

  /**
   * Called when a subscription is past due.
   */
  onSubscriptionPastDue?: (
    data: SubscriptionEvent<"subscription.past_due">,
  ) => void | Promise<void>;

  /**
   * Called when a subscription is paused.
   */
  onSubscriptionPaused?: (data: SubscriptionEvent<"subscription.paused">) => void | Promise<void>;

  /**
   * Called when a subscription is scheduled for cancellation.
   * This fires when a user requests cancellation at period end (not immediate).
   * The subscription status will be "scheduled_cancel" until the period ends.
   */
  onSubscriptionScheduledCancel?: (
    data: SubscriptionEvent<"subscription.scheduled_cancel">,
  ) => void | Promise<void>;

  /**
   * Called when a user should be granted access to the platform.
   * This is triggered for: active, trialing, and paid subscriptions.
   *
   * NOTE: This may be called multiple times for the same user/subscription.
   * Implement this as an idempotent operation (safe to call repeatedly).
   *
   * @example
   * onGrantAccess: async ({ reason, product, customer, metadata }) => {
   *   const userId = metadata?.referenceId as string;
   *   console.log(`Granting ${reason} to ${customer.email} for ${product.name}`);
   *   // Your database logic here
   * }
   */
  onGrantAccess?: (context: GrantAccessContext) => void | Promise<void>;

  /**
   * Called when a user's access should be revoked.
   * This is triggered for: paused, expired, and canceled (after period ends) subscriptions.
   *
   * NOTE: This may be called multiple times for the same user/subscription.
   * Implement this as an idempotent operation (safe to call repeatedly).
   *
   * @example
   * onRevokeAccess: async ({ reason, product, customer, metadata }) => {
   *   const userId = metadata?.referenceId as string;
   *   console.log(`Revoking access (${reason}) from ${customer.email}`);
   *   // Your database logic here
   * }
   */
  onRevokeAccess?: (context: RevokeAccessContext) => void | Promise<void>;
}
