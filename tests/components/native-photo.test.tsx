import { readFileSync } from "node:fs";
import { prepareImage } from "../../src/features/capture/prepare";
import { readPhotoFile } from "../../src/platform/photo-file";
import { assertMetadataFree } from "../../src/features/capture/metadata";

// Exercise the real native read/write adapter; only the OS filesystem and
// image decoder are mocked. The encoded photo remains a real decodable JPEG.
const mockFiles = new Map<string, Uint8Array>();
const mockWrite = jest.fn();
let mockKeepTrailing = false;
jest.mock("expo-file-system", () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    async bytes() {
      const bytes = mockFiles.get(this.uri);
      if (!bytes) throw new Error("image_read_failed");
      return bytes.slice();
    }
    write(bytes: Uint8Array) {
      mockWrite(this.uri, bytes);
      mockFiles.set(
        this.uri,
        mockKeepTrailing ? new Uint8Array([...bytes, 1]) : bytes.slice(),
      );
    }
  },
}));
const mockResize = jest.fn();
const mockReleaseContext = jest.fn();
const mockReleaseImage = jest.fn();
const mockRender = jest.fn();
const mockSave = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: () => ({
      resize: mockResize,
      renderAsync: mockRender,
      release: mockReleaseContext,
    }),
  },
}));
const original = "file:///documents/original";
const encoded = "file:///cache/newly-encoded.jpg";
const retained = `${original}.upload.jpg`;
const photo = new Uint8Array(
  readFileSync(`${__dirname}/../fixtures/camera-encoded.jpg`),
);
const segment = (marker: number, text: string) => {
  const data = new TextEncoder().encode(text);
  return [
    255,
    marker,
    (data.length + 2) >> 8,
    (data.length + 2) & 255,
    ...data,
  ];
};
const cameraJpeg = new Uint8Array([
  ...photo.slice(0, 2),
  ...segment(0xe1, "Exif\0\0private GPS, camera and capture details"),
  ...segment(0xe2, "ICC_PROFILE\0encoder color profile"),
  ...segment(0xfe, "private camera comment"),
  ...photo.slice(2),
]);
beforeEach(() => {
  jest.clearAllMocks();
  mockKeepTrailing = false;
  mockFiles.clear();
  mockFiles.set(original, cameraJpeg);
  mockFiles.set(encoded, cameraJpeg);
  mockSave.mockReset().mockResolvedValue({ uri: encoded });
  mockRender.mockReset().mockResolvedValue({
    width: 800,
    height: 600,
    saveAsync: mockSave,
    release: mockReleaseImage,
  });
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test("native camera EXIF, ICC and comments are removed from the actual upload file, preserving the original", async () => {
  expect(() => assertMetadataFree(cameraJpeg)).toThrow("metadata_detected");
  const uri = await prepareImage(original);
  expect(uri).toBe(retained);
  const result = await readPhotoFile(uri);
  expect(() => assertMetadataFree(result.bytes)).not.toThrow();
  expect(mockFiles.get(original)).toEqual(cameraJpeg);
  expect(mockFiles.get(uri)).toEqual(result.bytes);
  expect(mockWrite).toHaveBeenCalledTimes(1);
  expect(mockWrite).toHaveBeenCalledWith(retained, result.bytes);
  expect(mockSave).toHaveBeenCalledWith({ format: "jpeg", compress: 0.82 });
  expect(mockResize).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(mockReleaseImage).toHaveBeenCalledTimes(1);
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
});

test("portrait orientation is baked by the decoder before sizing and metadata removal", async () => {
  mockRender
    .mockResolvedValueOnce({
      width: 1800,
      height: 4000,
      release: mockReleaseImage,
    })
    .mockResolvedValueOnce({
      width: 720,
      height: 1600,
      release: mockReleaseImage,
      saveAsync: mockSave,
    });
  await prepareImage(original);
  expect(mockResize).toHaveBeenCalledWith({ height: 1600 });
  expect(mockRender).toHaveBeenCalledTimes(2);
  expect(mockReleaseImage).toHaveBeenCalledTimes(2);
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
});

test("an unfinished native draft still has its exact upload bytes after the OS clears the encoder cache", async () => {
  const uri = await prepareImage(original);
  const before = await readPhotoFile(uri);
  mockFiles.delete(encoded);
  expect((await readPhotoFile(uri)).bytes).toEqual(before.bytes);
  expect(mockFiles.get(original)).toEqual(cameraJpeg);
});

test.each(["decode", "resize", "encode", "read", "invalid", "write"])(
  "%s failures release image resources, retain the original and never return a derivative",
  async (stage) => {
    if (stage === "decode")
      mockRender.mockRejectedValueOnce(new Error("decode_failed"));
    if (stage === "resize")
      mockRender
        .mockResolvedValueOnce({
          width: 4000,
          height: 1800,
          release: mockReleaseImage,
        })
        .mockRejectedValueOnce(new Error("resize_failed"));
    if (stage === "encode")
      mockSave.mockRejectedValueOnce(new Error("encode_failed"));
    if (stage === "read") mockFiles.delete(encoded);
    if (stage === "invalid")
      mockFiles.set(encoded, new Uint8Array([...cameraJpeg, 1]));
    if (stage === "write")
      mockWrite.mockImplementationOnce(() => {
        throw new Error("write_failed");
      });
    await expect(prepareImage(original)).rejects.toThrow();
    expect(mockFiles.get(original)).toEqual(cameraJpeg);
    expect(mockReleaseContext).toHaveBeenCalledTimes(1);
    expect(mockReleaseImage).toHaveBeenCalledTimes(stage === "decode" ? 0 : 1);
    if (stage !== "write") expect(mockWrite).not.toHaveBeenCalled();
  },
);

test("an encoder returning the original URI cannot overwrite the retained photo", async () => {
  mockSave.mockResolvedValueOnce({ uri: original });
  await expect(prepareImage(original)).rejects.toThrow("image_not_prepared");
  expect(mockWrite).not.toHaveBeenCalled();
  expect(mockFiles.get(original)).toEqual(cameraJpeg);
});

test("a non-truncating filesystem write is detected before the derivative can be saved", async () => {
  mockKeepTrailing = true;
  await expect(prepareImage(original)).rejects.toThrow("image_write_failed");
  expect(mockFiles.get(original)).toEqual(cameraJpeg);
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
});
