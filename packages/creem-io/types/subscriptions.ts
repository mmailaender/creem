import { BaseEntity, Metadata } from "./general";
import { Product } from "./products";
import { Customer } from "./customer";
import { Transaction } from "./transactions";

/**
 * Subscription item entity
 */
export interface SubscriptionItem extends BaseEntity {
  /** String representing the object's type */
  object: "subscription_item";
  /** The product ID associated with the subscription item */
  productId?: string;
  /** The price ID associated with the subscription item */
  priceId?: string;
  /** The number of units for the subscription item */
  units?: number;
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "unpaid"
  | "paused"
  | "trialing"
  | "scheduled_cancel";

/**
 * Subscription entity
 */
export interface Subscription extends BaseEntity {
  /** String representing the object's type */
  object: "subscription";
  /** The product associated with the subscription */
  product: Product | string;
  /** The customer who owns the subscription */
  customer: Customer | string;
  /** Subscription items */
  items?: SubscriptionItem[];
  /** The method used for collecting payments */
  collectionMethod: "charge_automatically";
  /** The current status of the subscription */
  status: SubscriptionStatus;
  /** The ID of the last paid transaction */
  lastTransactionId?: string;
  /** The last paid transaction */
  lastTransaction?: Transaction;
  /** The date of the last paid transaction */
  lastTransactionDate?: Date;
  /** The date when the next subscription transaction will be charged */
  nextTransactionDate?: Date;
  /** The start date of the current subscription period */
  currentPeriodStartDate: Date;
  /** The end date of the current subscription period */
  currentPeriodEndDate: Date;
  /** The date when the subscription was canceled, if applicable */
  canceledAt: Date | null;
  /** The date when the subscription was created */
  createdAt: Date;
  /** The date when the subscription was last updated */
  updatedAt: Date;
  /** The discount code applied to the subscription, if any */
  discount?: object;
  /** Optional metadata */
  metadata?: Metadata;
}

/**
 * Subscription entity as returned in subscription webhook events.
 * The product and customer are always expanded (full objects, never just IDs).
 */
export interface NormalizedSubscription extends Omit<Subscription, "product" | "customer"> {
  /** The product associated with the subscription (always expanded in webhooks) */
  product: Product;
  /** The customer who owns the subscription (always expanded in webhooks) */
  customer: Customer;
}

/**
 * Request payload for retrieving a subscription
 */
export interface GetSubscriptionRequest {
  /** The subscription ID to retrieve */
  subscriptionId: string;
}

/**
 * Request payload for canceling a subscription
 */
export interface CancelSubscriptionRequest {
  /** The subscription ID to cancel */
  subscriptionId: string;
  /** The cancellation mode */
  mode?: "immediate" | "scheduled";
}

/**
 * Subscription item update
 */
export interface SubscriptionItemUpdate {
  /** The subscription item ID */
  id?: string;
  /** The product ID */
  productId?: string;
  /** The price ID */
  priceId?: string;
  /** The number of units */
  units?: number;
}

/**
 * Request payload for updating a subscription
 */
export interface UpdateSubscriptionRequest {
  /** The subscription ID to update */
  subscriptionId: string;
  /** The subscription items to update */
  items?: SubscriptionItemUpdate[];
  /** How to handle the update */
  updateBehavior?: "proration-charge-immediately" | "proration-charge" | "proration-none";
}

/**
 * Request payload for upgrading a subscription
 */
export interface UpgradeSubscriptionRequest {
  /** The subscription ID to upgrade */
  subscriptionId: string;
  /** The new product ID */
  productId: string;
  /** How to handle the upgrade */
  updateBehavior?: "proration-charge-immediately" | "proration-charge" | "proration-none";
}

/**
 * Request payload for pausing a subscription
 */
export interface PauseSubscriptionRequest {
  /** The subscription ID to pause */
  subscriptionId: string;
}

/**
 * Request payload for resuming a subscription
 */
export interface ResumeSubscriptionRequest {
  /** The subscription ID to resume */
  subscriptionId: string;
}
