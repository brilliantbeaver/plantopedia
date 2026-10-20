import type { ImageURISource } from "react-native";
import { throwIfAborted } from "./abort";

export type PrivatePhotoResource = {
  source: ImageURISource;
  release(): void;
};

export async function loadPrivatePhoto(
  uri: string,
  token: string,
  signal: AbortSignal,
): Promise<PrivatePhotoResource> {
  throwIfAborted(signal);
  return {
    source: {
      uri,
      headers: { Authorization: `Bearer ${token}` },
      cache: "reload",
    },
    release() {},
  };
}
