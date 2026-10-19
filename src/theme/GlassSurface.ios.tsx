import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  View,
  StyleSheet,
  type ViewProps,
} from "react-native";
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from "expo-glass-effect";
import { usePreferences } from "./preferences";
export function GlassSurface({ children, style, ...props }: ViewProps) {
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
  if (reduce || !isLiquidGlassAvailable() || !isGlassEffectAPIAvailable())
    return (
      <View {...props} style={[surface, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    );
  return (
    <GlassView {...props} colorScheme={mode} style={surface}>
      {children}
    </GlassView>
  );
}
const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 24, padding: 16 },
});
