import { RequestFn } from "../types/core";
import {
  GetSubscriptionRequest,
  CancelSubscriptionRequest,
  UpdateSubscriptionRequest,
  UpgradeSubscriptionRequest,
  PauseSubscriptionRequest,
  ResumeSubscriptionRequest,
  Subscription,
} from "../types";
import { required, isString, isArray } from "../validate";

export const subscriptionsResource = (request: RequestFn) => ({
  get: (params: GetSubscriptionRequest) => {
    // TODO: Return object is not compatible with types. Check.
    required(params.subscriptionId, "subscriptionId");
    isString(params.subscriptionId, "subscriptionId");

    return request<Subscription>("GET", "/v1/subscriptions", undefined, {
      subscription_id: params.subscriptionId,
    });
  },
  cancel: (params: CancelSubscriptionRequest) => {
    // TODO: Return object is not compatible with types. Check.
    required(params.subscriptionId, "subscriptionId");
    isString(params.subscriptionId, "subscriptionId");
    isString(params.mode, "mode");

    return request<Subscription>("POST", `/v1/subscriptions/${params.subscriptionId}/cancel`, {
      mode: params.mode,
    });
  },
  update: (params: UpdateSubscriptionRequest) => {
    // Items || updateBehavior should be required. Check.
    required(params.subscriptionId, "subscriptionId");
    isString(params.subscriptionId, "subscriptionId");
    isArray(params.items, "items");
    isString(params.updateBehavior, "updateBehavior");

    return request<Subscription>("POST", `/v1/subscriptions/${params.subscriptionId}`, {
      items: params.items?.map((item) => ({
        id: item.id,
        product_id: item.productId,
        price_id: item.priceId,
        units: item.units,
      })),
      update_behavior: params.updateBehavior,
    });
  },
  upgrade: (params: UpgradeSubscriptionRequest) => {
    required(params.subscriptionId, "subscriptionId");
    isString(params.subscriptionId, "subscriptionId");
    required(params.productId, "productId");
    isString(params.productId, "productId");
    isString(params.updateBehavior, "updateBehavior");

    return request<Subscription>("POST", `/v1/subscriptions/${params.subscriptionId}/upgrade`, {
      product_id: params.productId,
      update_behavior: params.updateBehavior,
    });
  },
  pause: (params: PauseSubscriptionRequest) => {
    required(params.subscriptionId, "subscriptionId");
    isString(params.subscriptionId, "subscriptionId");

    return request<Subscription>("POST", `/v1/subscriptions/${params.subscriptionId}/pause`);
  },
  resume: (params: ResumeSubscriptionRequest) => {
    required(params.subscriptionId, "subscriptionId");
    isString(params.subscriptionId, "subscriptionId");

    return request<Subscription>("POST", `/v1/subscriptions/${params.subscriptionId}/resume`);
  },
});
