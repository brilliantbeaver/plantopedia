import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ViewStyle,
  type ImageResizeMode,
  type StyleProp,
} from "react-native";
import { useSessionApi } from "../services/session";
import { publicConfig } from "../config/public-env";
import { usePreferences } from "../theme/preferences";
import { loadPrivatePhoto } from "../platform/private-photo";
import type { ApiClient } from "../services/api";
import { AppIcon } from "./AppIcon";
export function PrivatePhoto({
  plantId,
  photoId,
  style,
  resizeMode = "cover",
}: {
  plantId: string;
  photoId: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
}) {
  const { api } = useSessionApi();
  const { t, colors } = usePreferences();
  const [failed, setFailed] = useState<{
    api: ApiClient;
    plantId: string;
    photoId: string;
  } | null>(null);
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
      if (!current) return;
      if (!token) throw new Error("Photo authentication unavailable");
      const result = await loadPrivatePhoto(uri, token, controller.signal);
      if (!current) {
        result.release();
        return;
      }
      photo = result;
      setFailed(null);
      setLoaded({ api, plantId, photoId, photo: result });
    })().catch(() => {
      // Failed/expired authentication must never fall back to a public image URL.
      if (current) setFailed({ api, plantId, photoId });
    });
    return () => {
      current = false;
      controller.abort();
      photo?.release();
    };
  }, [api, plantId, photoId]);
  const unavailable =
    !publicConfig.success ||
    (failed?.api === api &&
      failed.plantId === plantId &&
      failed.photoId === photoId);
  const photo =
    loaded?.api === api &&
    loaded.plantId === plantId &&
    loaded.photoId === photoId
      ? loaded.photo
      : null;
  return (
    <View
      style={[
        {
          width: "100%",
          height: 240,
          borderRadius: 18,
          backgroundColor: colors.muted,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        },
        style,
      ]}
    >
      {unavailable ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t("photoUnavailable")}
        >
          <AppIcon name="image-outline" size={28} color={colors.secondary} />
        </View>
      ) : photo ? (
        <Image
          accessibilityLabel={t("photo")}
          source={photo.source}
          resizeMode={resizeMode}
          style={StyleSheet.absoluteFill}
          onError={() => setFailed({ api, plantId, photoId })}
        />
      ) : (
        <ActivityIndicator
          accessibilityLabel={t("loading")}
          color={colors.primary}
        />
      )}
    </View>
  );
}
