import { useState } from "react";
import { Pressable, Text, View, StyleSheet, PanResponder } from "react-native";
import { useRouter } from "expo-router";
import type { Plant } from "@plantopedia/contracts";
import { usePreferences } from "../theme/preferences";
import { PrivatePhoto } from "./PrivatePhoto";
import { AppIcon } from "./AppIcon";
import { IconButton, Action, Feedback } from "./ui";
import { useDeletion } from "../features/garden/DeletionProvider";
export function PlantCard({ plant }: { plant: Plant }) {
  const router = useRouter();
  const { t, colors } = usePreferences();
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [menu, setMenu] = useState(false);
  const deletion = useDeletion();
  const gesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -40) setMenu(true);
    },
  });
  if (deletion?.items.some((x) => x.id === plant.id)) return null;
  return (
    <View {...gesture.panHandlers} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${plant.nickname} · ${plant.scientificName ?? t("uncertain")}`}
          onPress={() => router.push(`/plants/${plant.id}`)}
          accessibilityActions={[{ name: "delete", label: t("remove") }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "delete") setMenu(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={({ pressed }) => [
            card.surface,
            { flex: 1 },
            {
              backgroundColor: colors.surface,
              borderColor: focused ? colors.primary : colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[card.photo, { backgroundColor: colors.muted }]}>
            <View style={card.placeholder}>
              <AppIcon name="leaf" size={34} color={colors.primary} />
            </View>
            {plant.coverPhotoId ? (
              <PrivatePhoto
                plantId={plant.id}
                photoId={plant.coverPhotoId}
                style={card.photoImage}
              />
            ) : null}
          </View>
          <View style={card.details}>
            <Text style={[card.name, { color: colors.text }]}>
              {plant.nickname}
            </Text>
            <Text style={[card.species, { color: colors.secondary }]}>
              {plant.scientificName ?? t("uncertain")}
            </Text>
            <View style={card.meta}>
              <AppIcon
                name={
                  plant.ownership === "owned"
                    ? "heart-outline"
                    : "compass-outline"
                }
                size={15}
                color={colors.secondary}
              />
              <Text style={[card.small, { color: colors.secondary }]}>
                {t(plant.ownership)}
                {plant.place ? ` · ${plant.place}` : ""}
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-forward" size={19} color={colors.secondary} />
        </Pressable>
        <IconButton
          icon="ellipsis-horizontal"
          label={`${t("itemOptions")}: ${plant.nickname}`}
          onPress={() => setMenu((x) => !x)}
        />
      </View>
      {menu && (
        <Action
          destructive
          title={t("remove")}
          icon="trash-outline"
          onPress={() => {
            if (deletion)
              void deletion
                .remove({ id: plant.id, label: plant.nickname, kind: "plant" })
                .catch(setError);
          }}
        />
      )}
      <Feedback error={error} />
    </View>
  );
}
const card = StyleSheet.create({
  surface: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 24,
    borderWidth: 2,
    minHeight: 112,
  },
  photo: { width: 84, height: 94, borderRadius: 17, overflow: "hidden" },
  placeholder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: 84, height: 94, borderRadius: 17 },
  details: { flex: 1, gap: 4 },
  name: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  species: { fontSize: 14, lineHeight: 20, fontStyle: "italic" },
  meta: { flexDirection: "row", gap: 5, alignItems: "center", marginTop: 3 },
  small: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
});
