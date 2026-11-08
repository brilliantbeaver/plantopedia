import { Platform, StyleSheet, View } from "react-native";
import { usePreferences } from "./preferences";

/** Static color behind glass; it never intercepts input or animates. */
export function BotanicalGlow() {
  const { mode } = usePreferences();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <View
        style={[
          styles.glow,
          {
            top: -80,
            right: -120,
            backgroundColor:
              mode === "dark" ? "rgba(56,193,95,0.15)" : "rgba(85,224,118,0.2)",
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          {
            top: 330,
            left: -150,
            backgroundColor:
              mode === "dark"
                ? "rgba(229,182,53,0.1)"
                : "rgba(255,205,75,0.22)",
          },
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    ...(Platform.OS === "web" ? { filter: "blur(65px)" } : {}),
  },
});
