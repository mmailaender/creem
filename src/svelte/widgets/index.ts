import SubscriptionComponent from "./Subscription.svelte";
import SubscriptionGroupComponent from "./SubscriptionGroup.svelte";
import ProductComponent from "./Product.svelte";
import ProductGroupComponent from "./ProductGroup.svelte";

export { default as BillingPortal } from "./BillingPortal.svelte";

export const Subscription: typeof SubscriptionComponent & {
  Group: typeof SubscriptionGroupComponent;
  Item: typeof SubscriptionComponent;
} = Object.assign(SubscriptionComponent, {
  Group: SubscriptionGroupComponent,
  Item: SubscriptionComponent,
});

export const Product: typeof ProductComponent & {
  Group: typeof ProductGroupComponent;
  Item: typeof ProductComponent;
} = Object.assign(ProductComponent, {
  Group: ProductGroupComponent,
  Item: ProductComponent,
});

export type {
  ConnectedBillingApi,
  ConnectedBillingModel,
  ProductType,
  SubscriptionPlanType,
  Transition,
} from "./types.js";
