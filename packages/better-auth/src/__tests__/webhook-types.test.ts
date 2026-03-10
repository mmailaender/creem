import { describe, it, expect } from "vitest";
import {
  isWebhookEventEntity,
  isWebhookEntity,
  isCheckoutEntity,
  isCustomerEntity,
  isOrderEntity,
  isProductEntity,
  isSubscriptionEntity,
  isRefundEntity,
  isDisputeEntity,
  isTransactionEntity,
} from "../webhook-types.js";
import {
  mockCustomer,
  mockProduct,
  mockOrder,
  mockSubscription,
  mockRefund,
  mockDispute,
  mockTransaction,
  mockCheckout,
} from "./fixtures.js";

describe("isWebhookEntity", () => {
  it("returns true for valid entities", () => {
    expect(isWebhookEntity(mockCustomer)).toBe(true);
    expect(isWebhookEntity(mockProduct)).toBe(true);
    expect(isWebhookEntity(mockOrder)).toBe(true);
    expect(isWebhookEntity(mockSubscription)).toBe(true);
    expect(isWebhookEntity(mockRefund)).toBe(true);
    expect(isWebhookEntity(mockDispute)).toBe(true);
    expect(isWebhookEntity(mockTransaction)).toBe(true);
    expect(isWebhookEntity(mockCheckout)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isWebhookEntity(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isWebhookEntity("string")).toBe(false);
    expect(isWebhookEntity(123)).toBe(false);
    expect(isWebhookEntity(undefined)).toBe(false);
  });

  it("returns false for objects without object field", () => {
    expect(isWebhookEntity({ id: "test" })).toBe(false);
  });

  it("returns false for objects with unknown object type", () => {
    expect(isWebhookEntity({ object: "unknown_type" })).toBe(false);
  });
});

describe("isWebhookEventEntity", () => {
  it("returns true for valid webhook event", () => {
    const event = {
      eventType: "checkout.completed",
      id: "evt_1",
      created_at: 123456,
      object: mockCheckout,
    };
    expect(isWebhookEventEntity(event)).toBe(true);
  });

  it("returns false for missing eventType", () => {
    expect(isWebhookEventEntity({ id: "evt_1", created_at: 123, object: mockCheckout })).toBe(
      false,
    );
  });

  it("returns false for missing id", () => {
    expect(
      isWebhookEventEntity({
        eventType: "checkout.completed",
        created_at: 123,
        object: mockCheckout,
      }),
    ).toBe(false);
  });

  it("returns false for missing created_at", () => {
    expect(
      isWebhookEventEntity({
        eventType: "checkout.completed",
        id: "evt_1",
        object: mockCheckout,
      }),
    ).toBe(false);
  });

  it("returns false for invalid object", () => {
    expect(
      isWebhookEventEntity({
        eventType: "checkout.completed",
        id: "evt_1",
        created_at: 123,
        object: { invalid: true },
      }),
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isWebhookEventEntity(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isWebhookEventEntity(42)).toBe(false);
    expect(isWebhookEventEntity("string")).toBe(false);
  });
});

describe("individual type guards", () => {
  it("isCheckoutEntity", () => {
    expect(isCheckoutEntity(mockCheckout)).toBe(true);
    expect(isCheckoutEntity(mockCustomer)).toBe(false);
    expect(isCheckoutEntity(null)).toBe(false);
    expect(isCheckoutEntity("string")).toBe(false);
  });

  it("isCustomerEntity", () => {
    expect(isCustomerEntity(mockCustomer)).toBe(true);
    expect(isCustomerEntity(mockProduct)).toBe(false);
    expect(isCustomerEntity(null)).toBe(false);
  });

  it("isOrderEntity", () => {
    expect(isOrderEntity(mockOrder)).toBe(true);
    expect(isOrderEntity(mockCustomer)).toBe(false);
    expect(isOrderEntity(null)).toBe(false);
  });

  it("isProductEntity", () => {
    expect(isProductEntity(mockProduct)).toBe(true);
    expect(isProductEntity(mockCustomer)).toBe(false);
    expect(isProductEntity(null)).toBe(false);
  });

  it("isSubscriptionEntity", () => {
    expect(isSubscriptionEntity(mockSubscription)).toBe(true);
    expect(isSubscriptionEntity(mockCustomer)).toBe(false);
    expect(isSubscriptionEntity(null)).toBe(false);
  });

  it("isRefundEntity", () => {
    expect(isRefundEntity(mockRefund)).toBe(true);
    expect(isRefundEntity(mockCustomer)).toBe(false);
    expect(isRefundEntity(null)).toBe(false);
  });

  it("isDisputeEntity", () => {
    expect(isDisputeEntity(mockDispute)).toBe(true);
    expect(isDisputeEntity(mockCustomer)).toBe(false);
    expect(isDisputeEntity(null)).toBe(false);
  });

  it("isTransactionEntity", () => {
    expect(isTransactionEntity(mockTransaction)).toBe(true);
    expect(isTransactionEntity(mockCustomer)).toBe(false);
    expect(isTransactionEntity(null)).toBe(false);
  });
});
