import { Blob as NodeBlob } from "node:buffer";
import { readPhotoFile } from "../../src/platform/photo-file.web";
import { assertMetadataFree } from "../../src/features/capture/metadata";
import { prepareImage } from "../../src/features/capture/prepare";

jest.mock("../../src/platform/photo-file", () =>
  jest.requireActual("../../src/platform/photo-file.web"),
);
jest.mock("expo-file-system", () => ({
  File: jest.fn(() => {
    throw new Error("Native File must not be used on web");
  }),
}));
const mockResize = jest.fn();
const mockReleaseImage = jest.fn();
const mockReleaseContext = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: () => ({
      resize: mockResize,
      release: mockReleaseContext,
      renderAsync: async () => ({
        saveAsync: async () => ({ uri: "blob:prepared" }),
        width: 2400,
        height: 1200,
        release: mockReleaseImage,
      }),
    }),
  },
}));
// Minimal JPEG marker stream accepted by the metadata gate; no real photo data.
const jpeg = new Uint8Array([
  255, 216, 255, 219, 0, 2, 255, 218, 0, 2, 255, 217,
]);
const originalFetch = global.fetch;
const originalBlob = global.Blob;
beforeEach(() => {
  jest.clearAllMocks();
  global.Blob = NodeBlob as unknown as typeof Blob;
});
afterEach(() => {
  global.fetch = originalFetch;
  global.Blob = originalBlob;
});

test("browser blob URLs yield bytes and a Blob suitable for multipart upload", async () => {
  const blob = new NodeBlob([jpeg], { type: "image/jpeg" });
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => blob });
  const result = await readPhotoFile("blob:selected-photo");
  expect(result.file.type).toBe("image/jpeg");
  expect(new Uint8Array(await result.file.arrayBuffer())).toEqual(jpeg);
  expect(result.bytes).toEqual(jpeg);
});

test("browser image preparation resizes and checks bytes without native filesystem access", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new NodeBlob([jpeg]) });
  await expect(prepareImage("blob:original")).resolves.toBe(
    `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`,
  );
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(mockReleaseImage).toHaveBeenCalled();
  expect(mockReleaseContext).toHaveBeenCalled();
});

test("browser preparation removes encoder metadata before the strict upload check", async () => {
  const exif = new Uint8Array([
    ...jpeg.slice(0, 2),
    255,
    225,
    0,
    8,
    69,
    120,
    105,
    102,
    0,
    0,
    ...jpeg.slice(2),
  ]);
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new NodeBlob([exif]) });
  const uri = await prepareImage("blob:original");
  expect(uri).toBe(
    `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`,
  );
  // Subsequent reads, previews and uploads use the cleaned bytes, not the old encoder URI.
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      blob: async () =>
        new NodeBlob([Buffer.from(uri.split(",")[1]!, "base64")], {
          type: "image/jpeg",
        }),
    });
  const result = await readPhotoFile(uri);
  expect(result.bytes).toEqual(jpeg);
  expect(new Uint8Array(await result.file.arrayBuffer())).toEqual(jpeg);
  expect(mockReleaseImage).toHaveBeenCalled();
  expect(mockReleaseContext).toHaveBeenCalled();
});

test("the browser upload reader cannot silently sanitize a derivative that failed preparation", async () => {
  const encoded = new Uint8Array([
    ...jpeg.slice(0, 2),
    255,
    225,
    0,
    2,
    ...jpeg.slice(2),
  ]);
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new NodeBlob([encoded]) });
  const result = await readPhotoFile("blob:unprepared");
  expect(() => assertMetadataFree(result.bytes)).toThrow("metadata_detected");
});

test("unreadable browser images fail before attempting to read a body", async () => {
  const blob = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({ ok: false, blob });
  await expect(readPhotoFile("blob:expired")).rejects.toThrow(
    "image_read_failed",
  );
  expect(blob).not.toHaveBeenCalled();
});
