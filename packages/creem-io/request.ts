import { toCamelCase } from "./utils";
import { RequestFn } from "./types/core";

export const createRequest = (apiKey: string, baseUrl: string): RequestFn => {
  return async <T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    data?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> => {
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "User-Agent": "creem-sdk-node/0.5.0",
    };

    const url = new URL(`${baseUrl}${path}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      let errorMessage = response.statusText;

      try {
        const errorBody = (await response.json()) as { message?: string };
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // Response wasn't JSON
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const responseData = await response.json();
    return toCamelCase(responseData) as T;
  };
};
