export function required(value: unknown, name: string): void {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required parameter: ${name}`);
  }
}

export function requiredWhen(value: unknown, name: string, condition: string): void {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required parameter: ${name}. ${name} is required when ${condition}`);
  }
}

export function isString(value: unknown, name: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`Parameter '${name}' must be a string`);
  }
}

export function isNumber(value: unknown, name: string): void {
  if (value !== undefined && typeof value !== "number") {
    throw new Error(`Parameter '${name}' must be a number`);
  }
}

export function isBoolean(value: unknown, name: string): void {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`Parameter '${name}' must be a boolean`);
  }
}

export function isArray(value: unknown, name: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`Parameter '${name}' must be an array`);
  }
}
