import { z } from "zod";
import { AppError } from "../application/errors.js";

export type DependencyFailure =
  | "credentials"
  | "permission_denied"
  | "not_found"
  | "timeout"
  | "rate_limited"
  | "network"
  | "upstream"
  | "unknown";

class FirebaseUnavailable extends AppError {
  constructor(
    service: string,
    retryable: boolean,
    readonly reason: DependencyFailure,
  ) {
    super(503, `${service}_unavailable`, retryable);
  }
}

export function dependencyFailure(error: unknown): DependencyFailure {
  return error instanceof FirebaseUnavailable ? error.reason : "unknown";
}

function failureReason(
  service: string,
  code: string | number,
): DependencyFailure {
  if (typeof code === "string")
    return code === "ETIMEDOUT" ? "timeout" : "network";
  const database = service === "database";
  if (code === (database ? 16 : 401)) return "credentials";
  if (code === (database ? 7 : 403)) return "permission_denied";
  if (code === (database ? 5 : 404)) return "not_found";
  if ([database ? 4 : 408, 504].includes(code)) return "timeout";
  if (code === (database ? 8 : 429)) return "rate_limited";
  return "upstream";
}

// Keep Firebase diagnostics (which can contain project names, URLs and IAM
// details) on the server. Clients need a stable service error, not a false
// authentication failure or an unexplained 500.
export async function firebaseOperation<T>(
  service: "database" | "photo_storage",
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AppError || error instanceof z.ZodError) throw error;
    const parsed = z
      .object({ code: z.union([z.number(), z.string()]) })
      .safeParse(error);
    if (!parsed.success) throw error;
    const code = parsed.data.code;
    if (code === "app/invalid-credential")
      throw new FirebaseUnavailable(service, false, "credentials");
    const permanent = service === "database" ? [5, 7, 16] : [401, 403, 404];
    const temporary =
      service === "database"
        ? [2, 4, 8, 13, 14]
        : [408, 429, 500, 502, 503, 504];
    const network = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
    ];
    if (
      (typeof code === "number" &&
        (permanent.includes(code) || temporary.includes(code))) ||
      (typeof code === "string" && network.includes(code))
    ) {
      throw new FirebaseUnavailable(
        service,
        typeof code === "string" || temporary.includes(code),
        failureReason(service, code),
      );
    }
    throw error;
  }
}
