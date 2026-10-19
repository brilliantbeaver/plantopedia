import { test, expect, jest } from "@jest/globals";
import { z } from "zod";
import { fixtures } from "./fixtures.js";
import { external } from "../src/application/core.js";
const auth = { uid: "user_a", sessionId: "session_user_a" };
const schema = z.object({ id: z.string(), value: z.string() });
test("unknown provider outcome is not automatically repeated", async () => {
  const { deps } = fixtures();
  const call = jest
    .fn<() => Promise<z.infer<typeof schema>>>()
    .mockRejectedValue(new Error("connection lost"));
  const perform = () =>
    external(
      deps,
      auth,
      "identify_key",
      "identification",
      { photoId: "photo_a" },
      schema,
      async () => {},
      call,
      async (tx, result) => {
        tx.set("users/user_a/results/result_a", result);
        return "users/user_a/results/result_a";
      },
    );
  await expect(perform()).rejects.toThrow("connection lost");
  await expect(perform()).rejects.toMatchObject({
    code: "provider_outcome_unknown",
    retryable: false,
  });
  expect(call).toHaveBeenCalledTimes(1);
});
test("completed provider result rehydrates once; changed payload is rejected", async () => {
  const { deps } = fixtures();
  const call = jest
    .fn<() => Promise<z.infer<typeof schema>>>()
    .mockResolvedValue({ id: "result_a", value: "one" });
  const perform = (payload: unknown) =>
    external(
      deps,
      auth,
      "key_a",
      "identification",
      payload,
      schema,
      async () => {},
      call,
      async (tx, result) => {
        tx.set("users/user_a/results/result_a", result);
        return "users/user_a/results/result_a";
      },
    );
  expect(await perform({ id: "one" })).toEqual(await perform({ id: "one" }));
  expect(call).toHaveBeenCalledTimes(1);
  await expect(perform({ id: "two" })).rejects.toMatchObject({
    code: "idempotency_conflict",
  });
});
test("expired upload lease is recovered and old attempt cannot finalize", async () => {
  const { deps } = fixtures();
  let release: (value: z.infer<typeof schema>) => void = () => {};
  const deferred = new Promise<z.infer<typeof schema>>((resolve) => {
    release = resolve;
  });
  const finalize = async (
    tx: import("../src/storage/repository.js").Transaction,
    result: z.infer<typeof schema>,
  ) => {
    tx.set("users/user_a/results/upload_a", result);
    return "users/user_a/results/upload_a";
  };
  const first = external(
    deps,
    auth,
    "upload_key",
    "photo",
    { id: "photo_a" },
    schema,
    async () => {},
    () => deferred,
    finalize,
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  deps.now = () => new Date("2026-10-18T13:00:00.000Z");
  const recovered = await external(
    deps,
    auth,
    "upload_key",
    "photo",
    { id: "photo_a" },
    schema,
    async () => {},
    async () => ({ id: "upload_a", value: "new attempt" }),
    finalize,
  );
  release({ id: "upload_a", value: "old attempt" });
  await expect(first).rejects.toMatchObject({ code: "stale_attempt" });
  expect(recovered.value).toBe("new attempt");
  expect(
    await deps.repository.get("users/user_a/results/upload_a", schema),
  ).toEqual(recovered);
});
