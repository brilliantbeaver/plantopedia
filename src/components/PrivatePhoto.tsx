import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { useSessionApi } from "../services/session";
import { publicConfig } from "../config/public-env";
import { usePreferences } from "../theme/preferences";
import { loadPrivatePhoto } from "../platform/private-photo";
import type { ApiClient } from "../services/api";
export function PrivatePhoto({
  plantId,
  photoId,
  style,
}: {
  plantId: string;
  photoId: string;
  style?: StyleProp<ImageStyle>;
}) {
  const { api } = useSessionApi();
  const { t } = usePreferences();
  const [loaded, setLoaded] = useState<{
    api: ApiClient;
    plantId: string;
    photoId: string;
    photo: Awaited<ReturnType<typeof loadPrivatePhoto>>;
  } | null>(null);
  useEffect(() => {
    if (!publicConfig.success) return;
    const uri = `${publicConfig.data.apiBaseUrl}/v1/photos/${photoId}?plantId=${plantId}`;
    let current = true;
    const controller = new AbortController();
    let photo: Awaited<ReturnType<typeof loadPrivatePhoto>> | undefined;
    void (async () => {
      const token = await api.token();
      if (!token || !current) return;
      const result = await loadPrivatePhoto(uri, token, controller.signal);
      if (!current) {
        result.release();
        return;
      }
      photo = result;
      setLoaded({ api, plantId, photoId, photo: result });
    })().catch(() => {
      // Failed/expired authentication must never fall back to a public image URL.
    });
    return () => {
      current = false;
      controller.abort();
      photo?.release();
    };
  }, [api, plantId, photoId]);
  if (
    !loaded ||
    loaded.api !== api ||
    loaded.plantId !== plantId ||
    loaded.photoId !== photoId
  )
    return null;
  return (
    <Image
      accessibilityLabel={t("photo")}
      source={loaded.photo.source}
      style={[{ width: "100%", height: 240, borderRadius: 18 }, style]}
    />
  );
}
