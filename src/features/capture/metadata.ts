/** Remove application/comment segments from a freshly encoded JPEG, preserving pixels.
 * Native JPEG and browser canvas encoders can add profiles after source metadata is gone.
 * The caller must still validate the returned bytes before upload.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const chunks: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 0xff) throw new Error("invalid_jpeg");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === undefined) throw new Error("invalid_jpeg");
    if (marker === 0xd9) {
      chunks.push(bytes.subarray(start));
      break;
    }
    if (marker === 0 || (marker >= 0xd0 && marker <= 0xd8))
      throw new Error("invalid_jpeg");
    const high = bytes[offset];
    const low = bytes[offset + 1];
    if (high === undefined || low === undefined)
      throw new Error("invalid_jpeg");
    const length = high * 256 + low;
    if (length < 2 || offset + length > bytes.length)
      throw new Error("invalid_jpeg");
    offset += length;
    if (marker !== 0xfe && !(marker >= 0xe0 && marker <= 0xef))
      chunks.push(bytes.subarray(start, offset));
    if (marker === 0xda) {
      const scanStart = offset;
      while (offset < bytes.length) {
        const next = bytes[offset + 1];
        if (
          bytes[offset] === 0xff &&
          next !== 0 &&
          !(next !== undefined && next >= 0xd0 && next <= 0xd7)
        )
          break;
        offset += bytes[offset] === 0xff ? 2 : 1;
      }
      chunks.push(bytes.subarray(scanStart, offset));
    }
  }
  const result = new Uint8Array(
    chunks.reduce((size, chunk) => size + chunk.length, 0),
  );
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  return result;
}

/** Fail closed before network ingress. Only baseline image data and a minimal JFIF header are allowed. */
export function assertMetadataFree(bytes: Uint8Array): void {
  const at = (index: number) => {
    const value = bytes[index];
    if (value === undefined) throw new Error("invalid_image");
    return value;
  };
  if (bytes.length < 12 || bytes.length > 2 * 1024 * 1024)
    throw new Error("image_size");
  if (at(0) === 0xff && at(1) === 0xd8) {
    let offset = 2;
    let imageData = false;
    while (offset < bytes.length) {
      if (at(offset++) !== 0xff) throw new Error("invalid_jpeg");
      while (at(offset) === 0xff) offset++;
      const marker = at(offset++);
      if (marker === 0xd9) {
        if (!imageData || offset !== bytes.length)
          throw new Error("invalid_jpeg");
        return;
      }
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd8))
        throw new Error("invalid_jpeg");
      const length = at(offset) * 256 + at(offset + 1);
      if (length < 2 || offset + length > bytes.length)
        throw new Error("invalid_jpeg");
      if (marker === 0xfe || (marker >= 0xe1 && marker <= 0xef))
        throw new Error("metadata_detected");
      if (
        marker === 0xe0 &&
        (length !== 16 ||
          String.fromCharCode(...bytes.slice(offset + 2, offset + 7)) !==
            "JFIF\0" ||
          at(offset + 14) !== 0 ||
          at(offset + 15) !== 0)
      )
        throw new Error("metadata_detected");
      offset += length;
      if (marker === 0xda) {
        imageData = true;
        while (offset < bytes.length) {
          if (
            at(offset) === 0xff &&
            at(offset + 1) !== 0 &&
            !(at(offset + 1) >= 0xd0 && at(offset + 1) <= 0xd7)
          )
            break;
          offset += at(offset) === 0xff ? 2 : 1;
        }
      }
    }
    throw new Error("invalid_jpeg");
  }
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.every((value, index) => at(index) === value)) {
    let offset = 8;
    let data = false;
    while (offset + 12 <= bytes.length) {
      const length =
        at(offset) * 16777216 +
        at(offset + 1) * 65536 +
        at(offset + 2) * 256 +
        at(offset + 3);
      const kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (!["IHDR", "PLTE", "IDAT", "IEND", "sRGB"].includes(kind))
        throw new Error("metadata_detected");
      if (offset + length + 12 > bytes.length) throw new Error("invalid_png");
      if (kind === "IDAT") data = true;
      offset += length + 12;
      if (kind === "IEND") {
        if (!data || length !== 0 || offset !== bytes.length)
          throw new Error("invalid_png");
        return;
      }
    }
  }
  throw new Error("unsupported_image");
}
