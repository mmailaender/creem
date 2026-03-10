import { RequestFn } from "../types/core";
import {
  GetTransactionRequest,
  ListTransactionsRequest,
  Transaction,
  TransactionList,
} from "../types";
import { required, isString, isNumber } from "../validate";

export const transactionsResource = (request: RequestFn) => ({
  get: (params: GetTransactionRequest) => {
    required(params.transactionId, "transactionId");
    isString(params.transactionId, "transactionId");

    return request<Transaction>("GET", "/v1/transactions", undefined, {
      transaction_id: params.transactionId,
    });
  },
  list: (params: ListTransactionsRequest = {}) => {
    isString(params.customerId, "customerId");
    isString(params.orderId, "orderId");
    isString(params.productId, "productId");
    isNumber(params.page, "page");
    isNumber(params.limit, "limit");

    return request<TransactionList>("GET", "/v1/transactions/search", undefined, {
      customer_id: params.customerId,
      order_id: params.orderId,
      product_id: params.productId,
      page_number: params.page,
      page_size: params.limit,
    });
  },
});
