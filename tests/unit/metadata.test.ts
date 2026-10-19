import { expect, test } from "@jest/globals";
import sharp from "sharp";
import {
  assertMetadataFree,
  stripJpegMetadata,
} from "../../src/features/capture/metadata.js";
const cleanPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQImWNgaGAAAAEEAIEl6+oTAAAAAElFTkSuQmCC",
  "base64",
);
const image = () =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: "green" } });

test.each([false, true])(
  "JPEG normalization removes profiles and EXIF while preserving decodable pixels (progressive: %s)",
  async (progressive) => {
    const encoded = await image()
      .withIccProfile("srgb")
      .withExif({ IFD0: { ImageDescription: "Private source note" } })
      .jpeg({ progressive })
      .toBuffer();
    expect(() => assertMetadataFree(encoded)).toThrow("metadata_detected");
    const clean = stripJpegMetadata(encoded);
    expect(() => assertMetadataFree(clean)).not.toThrow();
    const metadata = await sharp(clean).metadata();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBe(8);
    expect(await sharp(clean).raw().toBuffer()).toEqual(
      await sharp(encoded).raw().toBuffer(),
    );
  },
);

test("JPEG normalization cannot hide malformed or trailing data from validation", async () => {
  const clean = await image().jpeg().toBuffer();
  for (const bytes of [
    Buffer.concat([clean, Buffer.from("trailing private text")]),
    clean.subarray(0, clean.length - 2),
    Buffer.concat([
      clean.subarray(0, 2),
      Buffer.from([255, 226, 255, 255]),
      clean.subarray(2),
    ]),
  ])
    expect(() => assertMetadataFree(stripJpegMetadata(bytes))).toThrow();
});

test("all JPEG application/comment blocks are removed, including blocks between progressive scans", async () => {
  const encoded = await image().jpeg({ progressive: true }).toBuffer();
  const block = (marker: number) =>
    Buffer.from([255, marker, 0, 8, 80, 82, 73, 86, 65, 84]);
  // First SOS after the first scan is a legal place for more marker segments.
  const nextScan = encoded.indexOf(
    Buffer.from([255, 218]),
    encoded.indexOf(Buffer.from([255, 218])) + 2,
  );
  expect(nextScan).toBeGreaterThan(0);
  const blocks = Buffer.concat([
    ...Array.from({ length: 16 }, (_, index) => block(0xe0 + index)),
    block(0xfe),
  ]);
  const withMetadata = Buffer.concat([
    encoded.subarray(0, nextScan),
    blocks,
    encoded.subarray(nextScan),
  ]);
  const clean = stripJpegMetadata(withMetadata);
  expect(() => assertMetadataFree(clean)).not.toThrow();
  expect(Buffer.from(clean).includes(Buffer.from("PRIVAT"))).toBe(false);
  expect(await sharp(clean).raw().toBuffer()).toEqual(
    await sharp(encoded).raw().toBuffer(),
  );
});

test("PNG derivatives accept clean pixels and reject embedded EXIF and user-text chunks", async () => {
  const clean = cleanPng;
  expect((await sharp(clean).metadata()).format).toBe("png");
  expect(() => assertMetadataFree(clean)).not.toThrow();
  const exif = await image()
    .withExif({ IFD0: { ImageDescription: "Private source note" } })
    .png()
    .toBuffer();
  expect((await sharp(exif).metadata()).exif).toBeDefined();
  expect(() => assertMetadataFree(exif)).toThrow("metadata_detected");
  // Insert a textual chunk after the signature; the reader must reject it
  // regardless of the chunk's CRC or whether an image decoder would accept it.
  const payload = Buffer.from("Comment\0Private source note");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  for (const kind of ["tEXt", "iTXt", "zTXt", "eXIf"])
    expect(() =>
      assertMetadataFree(
        Buffer.concat([
          clean.subarray(0, 8),
          length,
          Buffer.from(kind),
          payload,
          Buffer.alloc(4),
          clean.subarray(8),
        ]),
      ),
    ).toThrow("metadata_detected");
});

test("PNG inspection fails closed on trailing data, missing pixel data and impossible chunk bounds", async () => {
  const clean = cleanPng;
  expect(() =>
    assertMetadataFree(
      Buffer.concat([clean, Buffer.from("private trailing text")]),
    ),
  ).toThrow("invalid_png");
  const missingPixels = Buffer.concat([
    clean.subarray(0, 8),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("IEND"),
    Buffer.alloc(4),
  ]);
  expect(() => assertMetadataFree(missingPixels)).toThrow("invalid_png");
  const truncated = Buffer.from(clean);
  truncated.writeUInt32BE(0xffffffff, 8);
  expect(() => assertMetadataFree(truncated)).toThrow("invalid_png");
  expect(() =>
    assertMetadataFree(clean.subarray(0, clean.length - 8)),
  ).toThrow();
});

test("JPEG allows a minimal JFIF header but rejects thumbnails and malformed/truncated segments", async () => {
  const clean = await image().jpeg().toBuffer();
  const header = Buffer.from([
    0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
  ]);
  const wrap = (segment: Uint8Array) =>
    Buffer.concat([clean.subarray(0, 2), segment, clean.subarray(2)]);
  expect(() => assertMetadataFree(wrap(header))).not.toThrow();
  const thumbnail = Buffer.from(header);
  thumbnail[16] = 1;
  expect(() => assertMetadataFree(wrap(thumbnail))).toThrow(
    "metadata_detected",
  );
  for (const bytes of [
    Buffer.concat([clean, Buffer.from("trailing")]),
    wrap(Buffer.from([0xff, 0xc0, 0, 1])),
    clean.subarray(0, clean.length - 2),
    wrap(Buffer.from([0xff, 0x00])),
    wrap(Buffer.from([0xff, 0xd0])),
  ])
    expect(() => assertMetadataFree(bytes)).toThrow();
});

test("unsupported input and oversized derivatives cannot reach the upload boundary", () => {
  expect(() => assertMetadataFree(new Uint8Array(2 * 1024 * 1024 + 1))).toThrow(
    "image_size",
  );
  expect(() =>
    assertMetadataFree(Buffer.from("not an encoded derivative")),
  ).toThrow("unsupported_image");
});
