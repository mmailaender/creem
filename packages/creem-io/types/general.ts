/**
 * Metadata type for storing arbitrary key-value pairs
 */
export type Metadata = Record<string, string | number | null>;

/**
 * Pagination details
 */
export interface Pagination {
  /** Total number of records in the list */
  totalRecords: number;
  /** Total number of pages available */
  totalPages: number;
  /** The current page number */
  currentPage: number;
  /** The next page number, or null if there is no next page */
  nextPage: number | null;
  /** The previous page number, or null if there is no previous page */
  prevPage: number | null;
}

/**
 * Base entity interface that all Creem objects extend
 */
export interface BaseEntity {
  /** Unique identifier for the object */
  id: string;
  /** Environment mode: test, prod, or sandbox */
  mode: "test" | "prod" | "sandbox";
}
