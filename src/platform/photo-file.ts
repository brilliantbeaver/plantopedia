import { File } from "expo-file-system";

export function photoFileExists(uri: string) {
  return new File(uri).exists;
}

export async function retainPreparedPhoto(uri: string, originalUri: string) {
  const destination = `${originalUri}.upload.jpg`;
  if (uri === destination) return uri;
  // Upgrade old cache-backed drafts without changing their upload bytes.
  return writePhotoFile(uri, (await readPhotoFile(uri)).bytes, originalUri);
}

export async function readPhotoFile(uri: string) {
  const file = new File(uri);
  return { file, bytes: await file.bytes() };
}

/** Replace only the newly encoded derivative, never the retained original. */
export async function writePhotoFile(
  uri: string,
  bytes: Uint8Array,
  originalUri?: string,
) {
  // Drafts outlive the OS cache. Store sanitized upload bytes beside their
  // retained original so retries reuse the exact same immutable payload.
  const file = new File(originalUri ? `${originalUri}.upload.jpg` : uri);
  file.write(bytes);
  // Confirm the on-disk multipart payload, including truncation of removed segments.
  const saved = await file.bytes();
  if (
    saved.length !== bytes.length ||
    saved.some((byte, i) => byte !== bytes[i])
  )
    throw new Error("image_write_failed");
  return file.uri;
}
