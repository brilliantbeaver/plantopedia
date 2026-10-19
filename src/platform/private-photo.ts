import type { ImageURISource } from "react-native";

export type PrivatePhotoResource = {
  source: ImageURISource;
  release(): void;
};

export async function loadPrivatePhoto(
  uri: string,
  token: string,
  signal: AbortSignal,
): Promise<PrivatePhotoResource> {
  signal.throwIfAborted();
  return {
    source: {
      uri,
      headers: { Authorization: `Bearer ${token}` },
      cache: "reload",
    },
    release() {},
  };
}
