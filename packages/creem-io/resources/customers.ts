import { RequestFn } from "../types/core";
import {
  ListCustomersRequest,
  GetCustomerRequest,
  GenerateCustomerPortalLinkRequest,
  CustomerList,
  Customer,
  CustomerLinks,
} from "../types";
import { required, isString, isNumber } from "../validate";

export const customersResource = (request: RequestFn) => ({
  list: (params: ListCustomersRequest = {}) => {
    isNumber(params.page, "page");
    isNumber(params.limit, "limit");

    return request<CustomerList>("GET", "/v1/customers/list", undefined, {
      page_number: params.page,
      page_size: params.limit,
    });
  },
  get: (params: GetCustomerRequest) => {
    isString(params.customerId, "customerId");
    isString(params.email, "email");

    if (!params.customerId && !params.email) {
      throw new Error("Either 'customerId' or 'email' must be provided to get a customer.");
    }

    return request<Customer>("GET", "/v1/customers", undefined, {
      customer_id: params.customerId,
      email: params.email,
    });
  },
  createPortal: (params: GenerateCustomerPortalLinkRequest) => {
    required(params.customerId, "customerId");
    isString(params.customerId, "customerId");

    return request<CustomerLinks>("POST", "/v1/customers/billing", {
      customer_id: params.customerId,
    });
  },
});
