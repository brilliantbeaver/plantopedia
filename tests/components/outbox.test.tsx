import { syncDraft } from "../../src/services/outbox";
import { local } from "../../src/services/local";
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import type { Draft } from "../../src/services/local-schema";
import type { ApiClient } from "../../src/services/api";
import { responseError } from "../../src/services/api";
import { Blob as NodeBlob } from "node:buffer";
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { apiBaseUrl: "https://fixture.invalid" },
  },
}));
jest.mock("../../src/services/local", () => ({
  local: { save: jest.fn(async () => {}) },
}));
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));
const draft: Draft = {
  id: "plant_a",
  owner: "user_a",
  observationId: "observation_a",
  photoId: "photo_a",
  capturedAt: "2026-10-18T12:00:00.000Z",
  original: "file:///original.jpg",
  width: 8,
  height: 8,
  derivative: "file:///encoded.jpg",
  nickname: "My tree",
  place: "",
  text: "Leaf",
  ownership: "observed",
  stage: "observation",
  failure: null,
};
function api(): ApiClient {
  return {
    token: jest.fn(async () => "fixture"),
    createPlant: jest.fn(),
    observe: jest.fn(),
  } as unknown as ApiClient;
}
beforeEach(() => {
  jest.clearAllMocks();
});
test("encoder metadata fails closed before any API upload and retains draft", async () => {
  jest.mocked(File).mockImplementation(
    () =>
      ({
        bytes: async () =>
          new Uint8Array([
            255, 216, 255, 225, 0, 8, 69, 120, 105, 102, 0, 0, 255, 217,
          ]),
      }) as File,
  );
  await expect(syncDraft(api(), draft, "en", () => true)).rejects.toThrow(
    "metadata_detected",
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(local.save).toHaveBeenLastCalledWith(
    expect.objectContaining({
      original: draft.original,
      stage: "observation",
      failure: "sync_failed",
    }),
  );
});
test("account change stops work before provider/API access", async () => {
  const client = api();
  await expect(
    syncDraft(client, { ...draft, stage: "draft" }, "en", () => false),
  ).rejects.toThrow("account_changed");
  expect(client.createPlant).not.toHaveBeenCalled();
  expect(client.token).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test("a typed upload failure retains its code, photo and stage for retry", async () => {
  const bytes = new Uint8Array([
    255, 216, 255, 219, 0, 2, 255, 218, 0, 2, 255, 217,
  ]);
  jest.mocked(File).mockImplementation(
    () =>
      Object.assign(new NodeBlob([bytes], { type: "image/jpeg" }), {
        bytes: async () => bytes,
      }) as unknown as File,
  );
  jest.mocked(fetch).mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({
      code: "photo_storage_unavailable",
      messageKey: "errors.photo_storage_unavailable",
      retryable: false,
      requestId: "fixture",
    }),
  } as unknown as Awaited<ReturnType<typeof fetch>>);
  await expect(syncDraft(api(), draft, "en", () => true)).rejects.toMatchObject(
    { code: "photo_storage_unavailable", status: 503, retryable: false },
  );
  expect(local.save).toHaveBeenLastCalledWith(
    expect.objectContaining({
      original: draft.original,
      derivative: draft.derivative,
      stage: "observation",
      failure: "photo_storage_unavailable",
    }),
  );
});

test("an HTML gateway error preserves the HTTP failure instead of throwing a JSON error", async () => {
  const error = await responseError({
    status: 503,
    json: async () => {
      throw new SyntaxError("HTML response");
    },
  });
  expect(error).toMatchObject({
    status: 503,
    code: "request_failed",
    retryable: true,
  });
});
