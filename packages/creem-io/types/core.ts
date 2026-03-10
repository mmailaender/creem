export type RequestFn = <T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  data?: unknown,
  queryParams?: Record<string, string | number | boolean | undefined>,
) => Promise<T>;
