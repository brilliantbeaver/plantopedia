import { useEffect, useState } from "react";
import { AccessibilityInfo, View, StyleSheet } from "react-native";
import type { GlassSurfaceProps } from "./GlassSurface";
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from "expo-glass-effect";
import { usePreferences } from "./preferences";
export function GlassSurface({
  children,
  style,
  tint,
  ...props
}: GlassSurfaceProps) {
  const { colors, mode } = usePreferences();
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduce,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  const surface = [styles.surface, { borderColor: colors.border }, style];
  const tinted =
    tint === "botanical"
      ? mode === "dark"
        ? "#164B35"
        : "#DDF8CE"
      : colors.surface;
  if (reduce || !isLiquidGlassAvailable() || !isGlassEffectAPIAvailable())
    return (
      <View {...props} style={[surface, { backgroundColor: tinted }]}>
        {children}
      </View>
    );
  return (
    <GlassView
      {...props}
      colorScheme={mode}
      {...(tint === "botanical" ? { tintColor: tinted } : {})}
      style={surface}
    >
      {children}
    </GlassView>
  );
}
const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 24, padding: 16 },
});
