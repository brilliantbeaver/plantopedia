import { useEffect, useState } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import type { GlassSurfaceProps } from "./GlassSurface";
import { usePreferences } from "./preferences";
export function GlassSurface({ style, tint, ...props }: GlassSurfaceProps) {
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
        backdropFilter: "blur(28px) saturate(180%)",
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
        {
          backgroundColor:
            tint === "botanical"
              ? mode === "dark"
                ? "#164B35"
                : "#DDF8CE"
              : colors.surface,
          borderColor: colors.border,
        },
        glass,
        tint === "botanical" &&
          !opaque && {
            backgroundColor:
              mode === "dark"
                ? "rgba(18,70,47,0.88)"
                : "rgba(221,250,205,0.76)",
            backgroundImage:
              mode === "dark"
                ? "linear-gradient(130deg, rgba(57,146,90,0.32), rgba(18,70,47,0.1) 55%, rgba(171,126,21,0.18))"
                : "linear-gradient(130deg, rgba(255,255,255,0.88), rgba(179,245,141,0.58) 55%, rgba(255,215,99,0.4))",
            borderColor:
              mode === "dark"
                ? "rgba(177,237,176,0.5)"
                : "rgba(255,255,255,0.95)",
            boxShadow:
              mode === "dark"
                ? "inset 0 1px 0 rgba(218,255,218,0.3), 0 12px 36px rgba(0,0,0,0.2)"
                : "inset 0 1px 0 #fff, inset 0 -1px 0 rgba(125,177,85,0.18), 0 12px 36px rgba(41,110,45,0.12)",
          },
        style,
      ]}
    />
  );
}
export const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 28, padding: 18 },
});
