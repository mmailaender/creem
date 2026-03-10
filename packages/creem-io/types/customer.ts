import { BaseEntity, Pagination } from "./general";

/**
 * Customer entity
 */
export interface Customer extends BaseEntity {
  /** String representing the object's type */
  object: "customer";
  /** Customer email address */
  email: string;
  /** Customer name */
  name?: string;
  /** The ISO alpha-2 country code for the customer */
  country: string;
  /** Creation date of the customer */
  createdAt: Date;
  /** Last updated date of the customer */
  updatedAt: Date;
}

/**
 * Customer list response
 */
export interface CustomerList {
  /** List of customers */
  items: Customer[];
  /** Pagination details */
  pagination: Pagination;
}

/**
 * Customer portal links
 */
export interface CustomerLinks {
  /** URL to the customer portal */
  customerPortalLink: string;
}

/**
 * Request payload for listing customers
 */
export interface ListCustomersRequest {
  /** Page number for pagination */
  page?: number;
  /** Number of items per page */
  limit?: number;
}

/**
 * Request payload for retrieving a customer
 */
export interface GetCustomerRequest {
  /** The customer ID to retrieve */
  customerId?: string;
  /** The customer email to retrieve */
  email?: string;
}

/**
 * Request payload for generating a customer portal link
 */
export interface GenerateCustomerPortalLinkRequest {
  /** The customer ID to generate a portal link for */
  customerId: string;
}
