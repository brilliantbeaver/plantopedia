import { resumeDraftPhoto } from "../../src/features/capture/resume";
import type { Draft } from "../../src/services/local-schema";
import type { ApiClient } from "../../src/services/api";
const mockExists = jest.fn();
const mockRetain = jest.fn();
const mockPrepare = jest.fn();
jest.mock("../../src/platform/photo-file", () => ({
  photoFileExists: (...args: unknown[]) => mockExists(...args),
  retainPreparedPhoto: (...args: unknown[]) => mockRetain(...args),
}));
jest.mock("../../src/features/capture/prepare", () => ({
  prepareImage: (...args: unknown[]) => mockPrepare(...args),
}));
const draft: Draft = {
  id: "plant_a",
  owner: "user_a",
  observationId: "observation_a",
  photoId: "photo_a",
  original: "file:///documents/original",
  derivative: "file:///cache/encoded.jpg",
  capturedAt: "2026-10-18T12:00:00.000Z",
  width: 100,
  height: 100,
  nickname: "Plant",
  place: "",
  text: "",
  ownership: "observed",
  stage: "observation",
  failure: "sync_failed",
};
const plant = jest.fn();
const api = { plant } as unknown as ApiClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockExists.mockReturnValue(false);
  mockPrepare.mockResolvedValue("file:///documents/original.upload.jpg");
  mockRetain.mockResolvedValue("file:///documents/original.upload.jpg");
  plant.mockResolvedValue({ photos: [] });
});
test("a cache-backed draft is migrated byte-for-byte without decoding or changing its IDs", async () => {
  mockExists.mockReturnValue(true);
  expect(await resumeDraftPhoto(api, draft)).toEqual({
    ...draft,
    derivative: "file:///documents/original.upload.jpg",
  });
  expect(mockRetain).toHaveBeenCalledWith(draft.derivative, draft.original);
  expect(mockPrepare).not.toHaveBeenCalled();
  expect(plant).not.toHaveBeenCalled();
});
test("an expired cache with a lost upload acknowledgement resumes the saved photo without another upload", async () => {
  plant.mockResolvedValue({
    photos: [
      {
        id: draft.photoId,
        observationId: draft.observationId,
        capturedAt: draft.capturedAt,
      },
    ],
  });
  expect(await resumeDraftPhoto(api, draft)).toEqual({
    ...draft,
    stage: "photo",
    failure: null,
  });
  expect(mockPrepare).not.toHaveBeenCalled();
});
test("an expired unsent derivative is rebuilt from the retained original with the original operation identities", async () => {
  expect(await resumeDraftPhoto(api, draft)).toEqual({
    ...draft,
    derivative: "file:///documents/original.upload.jpg",
  });
  expect(mockPrepare).toHaveBeenCalledWith(draft.original);
});
test("a completed photo never requires the old local derivative or calls identification again", async () => {
  expect(await resumeDraftPhoto(api, { ...draft, stage: "photo" })).toEqual({
    ...draft,
    stage: "photo",
  });
  expect(mockPrepare).not.toHaveBeenCalled();
  expect(plant).not.toHaveBeenCalled();
});
test("an unavailable server keeps the original pending draft instead of replacing an uncertain upload", async () => {
  plant.mockRejectedValue(new Error("offline"));
  await expect(resumeDraftPhoto(api, draft)).rejects.toThrow("offline");
  expect(mockPrepare).not.toHaveBeenCalled();
});
