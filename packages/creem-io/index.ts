import { productsResource } from "./resources/products";
import { checkoutsResource } from "./resources/checkouts";
import { customersResource } from "./resources/customers";
import { subscriptionsResource } from "./resources/subscriptions";
import { transactionsResource } from "./resources/transactions";
import { licensesResource } from "./resources/licenses";
import { discountsResource } from "./resources/discounts";
import { webhooksResource } from "./resources/webhooks";
import { createRequest } from "./request";

interface CreemOptions {
  apiKey: string;
  webhookSecret?: string;
  testMode?: boolean;
}

export function createCreem({ apiKey, webhookSecret, testMode = false }: CreemOptions) {
  const baseUrl = testMode ? "https://test-api.creem.io" : "https://api.creem.io";

  const request = createRequest(apiKey, baseUrl);

  return {
    products: productsResource(request),
    checkouts: checkoutsResource(request),
    customers: customersResource(request),
    subscriptions: subscriptionsResource(request),
    transactions: transactionsResource(request),
    licenses: licensesResource(request),
    discounts: discountsResource(request),
    webhooks: webhooksResource(webhookSecret),
  };
}

export * from "./types";
