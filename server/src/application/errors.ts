export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(code);
  }
}
export function requireValue<T>(
  value: T | null | undefined,
  code = "not_found",
): T {
  if (value === undefined || value === null) throw new AppError(404, code);
  return value;
}
