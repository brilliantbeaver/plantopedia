import {
  dependencyFailure,
  type DependencyFailure,
} from "../storage/availability.js";

type CheckResult =
  { status: "ready" } | { status: "unavailable"; reason: DependencyFailure };

// A response deadline does not cancel Firebase's SDK request/retries. Retain
// that request until it settles, so polling never piles up duplicate work.
export function readinessCheck(work: () => Promise<unknown>, timeoutMs = 5000) {
  let pending: Promise<CheckResult> | undefined;
  return async (): Promise<CheckResult> => {
    if (!pending) {
      const operation = Promise.resolve()
        .then(work)
        .then(
          (): CheckResult => ({ status: "ready" }),
          (error: unknown): CheckResult => ({
            status: "unavailable",
            reason: dependencyFailure(error),
          }),
        );
      pending = operation;
      void operation.then(() => {
        pending = undefined;
      });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        pending,
        new Promise<CheckResult>((resolve) => {
          timer = setTimeout(
            () => resolve({ status: "unavailable", reason: "timeout" }),
            timeoutMs,
          );
          timer.unref();
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
}
