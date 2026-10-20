import {
  AbortController as NativeAbortController,
  AbortSignal as NativeAbortSignal,
} from "abort-controller";
import { installAbortSignalPatch } from "expo/src/winter/AbortSignal";
import { z } from "zod";
import { apiClient } from "../../src/services/api";
import { loadPrivatePhoto } from "../../src/platform/private-photo";
import { throwIfAborted } from "../../src/platform/abort";

jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { apiBaseUrl: "https://fixture.invalid" },
  },
}));
jest.mock("../../src/platform/api-endpoint", () => ({
  phoneApiUnreachable: () => false,
}));

// React Native installs this package, not Node's newer AbortController.
const originalController = global.AbortController;
const originalSignal = global.AbortSignal;
const originalFetch = global.fetch;
beforeEach(() => {
  jest.useFakeTimers();
  global.AbortController = NativeAbortController as typeof AbortController;
  global.AbortSignal = installAbortSignalPatch(
    NativeAbortSignal as typeof AbortSignal,
  );
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ saved: true }),
  });
});
afterEach(() => {
  global.AbortController = originalController;
  global.AbortSignal = originalSignal;
  global.fetch = originalFetch;
  jest.useRealTimers();
});

test("native token acquisition reaches the authenticated save request without throwIfAborted", async () => {
  expect(new AbortController().signal.throwIfAborted).toBeUndefined();
  const client = apiClient(async () => "fixture-token");
  await expect(
    client.request("/plants", z.object({ saved: z.boolean() }), {
      method: "POST",
      body: { nickname: "Plant" },
      key: "plant_fixture",
    }),
  ).resolves.toEqual({ saved: true });
  expect(global.fetch).toHaveBeenCalledWith(
    "https://fixture.invalid/v1/plants",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer fixture-token",
      }),
    }),
  );
});

test("native disposal blocks a token that resolves after disposal and reactivation", async () => {
  let resolve!: (value: string) => void;
  const client = apiClient(
    () => new Promise<string>((done) => (resolve = done)),
  );
  const pending = client.request("/plants", z.unknown());
  client.dispose();
  client.activate();
  resolve("stale-token");
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(global.fetch).not.toHaveBeenCalled();
});

test("native photo resources work with the native signal and reject cancelled loads", async () => {
  const controller = new AbortController();
  const uri = "https://fixture.invalid/v1/photos/photo_fixture";
  await expect(
    loadPrivatePhoto(uri, "fixture-token", controller.signal),
  ).resolves.toMatchObject({
    source: { uri, headers: { Authorization: "Bearer fixture-token" } },
  });
  controller.abort();
  await expect(
    loadPrivatePhoto(uri, "fixture-token", controller.signal),
  ).rejects.toMatchObject({
    name: "AbortError",
  });
});

test("disposed native clients do not acquire a token, and reactivated clients work", async () => {
  const getToken = jest.fn(async () => "fixture-token");
  const client = apiClient(getToken);
  client.dispose();
  await expect(client.token()).rejects.toMatchObject({ name: "AbortError" });
  expect(getToken).not.toHaveBeenCalled();
  client.activate();
  await expect(client.token()).resolves.toBe("fixture-token");
});

test("Expo native timeout and combined signals retain cancellation semantics", () => {
  const controller = new AbortController();
  const timeout = AbortSignal.timeout(25000);
  const combined = AbortSignal.any([controller.signal, timeout]);
  expect(() => throwIfAborted(combined)).not.toThrow();
  jest.advanceTimersByTime(25000);
  expect(combined.aborted).toBe(true);
  expect(() => throwIfAborted(timeout)).toThrow(
    expect.objectContaining({ name: "TimeoutError" }),
  );
  // Expo's shim supplies the combined signal's fallback AbortError before
  // attaching the timeout reason to its source signal. Both must cancel.
  expect(() => throwIfAborted(combined)).toThrow(
    expect.objectContaining({ name: "AbortError" }),
  );
});

test("browser cancellation preserves its explicit reason", () => {
  const controller = new originalController();
  const reason = new Error("cancelled by caller");
  controller.abort(reason);
  expect(() => throwIfAborted(controller.signal)).toThrow(reason);
});
