import { useState } from "react";
import { Image, PanResponder, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Action,
  Card,
  Copy,
  EmptyState,
  Feedback,
  IconButton,
} from "../../components/ui";
import { useSessionApi } from "../../services/session";
import { usePreferences, designTokens } from "../../theme/preferences";
import { gardenData } from "../../services/garden-data";
import { useDeletion } from "../garden/DeletionProvider";
export function GardenSightings() {
  const { owner, api } = useSessionApi();
  const { t } = usePreferences();
  const router = useRouter();
  const deletion = useDeletion();
  const data = useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
  });
  const [menu, setMenu] = useState<string | null>(null),
    [error, setError] = useState<unknown>(null);
  const sightings = data.data?.sightings.filter(
    (s) => !deletion?.items.some((p) => p.kind === "sighting" && p.id === s.id),
  );
  return (
    <View style={{ gap: 14 }}>
      <Feedback loading={data.isPending} error={data.error ?? error} />
      {sightings?.length === 0 && (
        <EmptyState
          icon="bug-outline"
          title={t("spotted")}
          description={t("noSightings")}
          action={t("scan")}
          onPress={() => router.push("/scan")}
        />
      )}
      {sightings?.map((s) => {
        const name =
          s.identification?.commonName ??
          s.identification?.scientificName ??
          t("uncertainVerdict");
        return (
          <View
            key={s.id}
            {...PanResponder.create({
              onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
              onPanResponderRelease: (_, g) => {
                if (g.dx < -40) setMenu(s.id);
              },
            }).panHandlers}
          >
            <Card>
              <Image
                source={{ uri: s.photoUri }}
                accessibilityLabel={t("photo")}
                resizeMode="contain"
                style={{
                  height: 150,
                  width: "100%",
                  borderRadius: designTokens.radius.photo,
                }}
              />
              <Copy large>{name}</Copy>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Action
                    secondary
                    title={t("detailsStep")}
                    accessibilityLabel={`${name} · ${t("detailsStep")}`}
                    accessibilityActions={[
                      { name: "delete", label: t("remove") },
                    ]}
                    onAccessibilityAction={(event) => {
                      if (event.nativeEvent.actionName === "delete")
                        setMenu(s.id);
                    }}
                    onPress={() =>
                      router.push({
                        pathname: "/sightings/[sightingId]",
                        params: { sightingId: s.id },
                      })
                    }
                  />
                </View>
                <IconButton
                  icon="ellipsis-horizontal"
                  label={t("itemOptions")}
                  onPress={() => setMenu(menu === s.id ? null : s.id)}
                />
              </View>
              {menu === s.id && (
                <Action
                  destructive
                  title={t("remove")}
                  onPress={() =>
                    void deletion
                      ?.remove({ id: s.id, label: name, kind: "sighting" })
                      .catch(setError)
                  }
                />
              )}
            </Card>
          </View>
        );
      })}
    </View>
  );
}
