import { useEffect, useState } from "react";
import { View, StyleSheet, type ViewProps, type ViewStyle } from "react-native";
import { usePreferences } from "./preferences";
export function GlassSurface({ style, ...props }: ViewProps) {
  const { colors, mode } = usePreferences();
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    const transparency = window.matchMedia(
      "(prefers-reduced-transparency: reduce)",
    );
    const contrast = window.matchMedia("(prefers-contrast: more)");
    const update = () =>
      setOpaque(
        transparency.matches ||
          contrast.matches ||
          !CSS.supports("backdrop-filter", "blur(1px)"),
      );
    update();
    transparency.addEventListener("change", update);
    contrast.addEventListener("change", update);
    return () => {
      transparency.removeEventListener("change", update);
      contrast.removeEventListener("change", update);
    };
  }, []);
  const glass: ViewStyle & {
    backdropFilter?: string;
    backgroundImage?: string;
  } = opaque
    ? {}
    : {
        backgroundColor:
          mode === "dark" ? "rgba(29,44,35,0.84)" : "rgba(255,255,255,0.72)",
        backdropFilter: "blur(24px) saturate(150%)",
        backgroundImage:
          mode === "dark"
            ? "linear-gradient(120deg, rgba(220,255,228,0.07), rgba(29,44,35,0.15) 65%)"
            : "linear-gradient(120deg, rgba(255,255,255,0.9), rgba(232,246,235,0.18) 65%)",
        boxShadow:
          mode === "dark"
            ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 28px rgba(0,0,0,0.14)"
            : "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 28px rgba(30,70,45,0.06)",
      };
  return (
    <View
      {...props}
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
        glass,
        style,
      ]}
    />
  );
}
export const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 28, padding: 18 },
});
