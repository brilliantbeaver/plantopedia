import { responseError } from "../services/api";
import type { PrivatePhotoResource } from "./private-photo";
import { throwIfAborted } from "./abort";

export async function loadPrivatePhoto(
  uri: string,
  token: string,
  signal: AbortSignal,
): Promise<PrivatePhotoResource> {
  // React Native Web's Image ignores source.headers. Fetch privately first;
  // rendering a local blob keeps credentials out of URLs and preserves CORP.
  const response = await fetch(uri, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw await responseError(response);
  const blob = await response.blob();
  throwIfAborted(signal);
  const objectUrl = URL.createObjectURL(blob);
  return {
    source: { uri: objectUrl },
    release: () => URL.revokeObjectURL(objectUrl),
  };
}
