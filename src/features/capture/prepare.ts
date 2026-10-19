import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from "expo-image-manipulator";
import { readPhotoFile, writePhotoFile } from "../../platform/photo-file";
import { assertMetadataFree, stripJpegMetadata } from "./metadata";

export async function prepareImage(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  let rendered: ImageRef | undefined;
  try {
    // Decode and apply source orientation before removing EXIF. Use the actual
    // upright dimensions rather than the camera/library's pre-rotation hints.
    rendered = await context.renderAsync();
    const { width, height } = rendered;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    )
      throw new Error("invalid_image");
    if (Math.max(width, height) > 1600) {
      context.resize(width >= height ? { width: 1600 } : { height: 1600 });
      rendered.release();
      rendered = undefined;
      rendered = await context.renderAsync();
    }
    const image = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.82,
    });
    if (image.uri === uri) throw new Error("image_not_prepared");
    const { bytes } = await readPhotoFile(image.uri);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
      throw new Error("unsupported_image");
    // Re-encoding alone is not a metadata guarantee: native JPEG and browser
    // canvas encoders can add EXIF/ICC/APP segments of their own.
    const clean = stripJpegMetadata(bytes);
    assertMetadataFree(clean);
    return await writePhotoFile(image.uri, clean, uri);
  } catch (error) {
    if (__DEV__)
      console.warn(
        "Photo preparation failed:",
        error instanceof Error ? error.message : "unknown_error",
      );
    throw error;
  } finally {
    rendered?.release();
    context.release();
  }
}
