import SubscriptionRoot from "./Subscription.svelte";
import SubscriptionPlan from "./SubscriptionPlan.svelte";
import ProductRoot from "./Product.svelte";
import ProductGroup from "./ProductGroup.svelte";
import ProductItem from "./ProductItem.svelte";

export { default as ConnectedBillingPortal } from "./ConnectedBillingPortal.svelte";

export const Subscription = Object.assign(SubscriptionRoot, {
  Plan: SubscriptionPlan,
});

export const Product = Object.assign(ProductRoot, {
  Group: ProductGroup,
  Item: ProductItem,
});

export type {
  ConnectedBillingApi,
  ConnectedBillingModel,
  ProductType,
  SubscriptionPlanType,
  Transition,
} from "./types.js";
