import Ionicons from "@expo/vector-icons/Ionicons";
import { View, StyleSheet, type ColorValue } from "react-native";
import { usePreferences } from "../theme/preferences";

export type IconName = keyof typeof Ionicons.glyphMap;
export function AppIcon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const { colors } = usePreferences();
  return (
    <View
      aria-hidden
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size} color={color ?? colors.text} />
    </View>
  );
}
export function IconBadge({
  name,
  tone = "leaf",
  size = 48,
}: {
  name: IconName;
  tone?: "leaf" | "water" | "sun";
  size?: number;
}) {
  const { colors, mode } = usePreferences();
  const palette =
    tone === "water"
      ? {
          ink: mode === "dark" ? "#9CDAED" : "#176377",
          fill: mode === "dark" ? "#203F49" : "#E3F2F5",
        }
      : tone === "sun"
        ? {
            ink: mode === "dark" ? "#F8D38D" : "#8A5714",
            fill: mode === "dark" ? "#443923" : "#FFF0D3",
          }
        : { ink: colors.primary, fill: colors.muted };
  return (
    <View
      style={[
        iconStyles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: palette.fill,
        },
      ]}
    >
      <AppIcon name={name} size={size * 0.52} color={palette.ink} />
    </View>
  );
}
const iconStyles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
