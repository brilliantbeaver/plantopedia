import { useEffect, useState } from "react";
import { AccessibilityInfo, View, type ViewProps } from "react-native";
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from "expo-glass-effect";
export function GlassPanel({ style, ...props }: ViewProps) {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setReduce(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduce);
    return () => { active = false; subscription.remove(); };
  }, []);
  const shared = [{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#83a99a" }, style];
  if (reduce || !isLiquidGlassAvailable() || !isGlassEffectAPIAvailable()) return <View {...props} style={[shared, { backgroundColor: "#f5fff9" }]} />;
  return <GlassView {...props} colorScheme="light" style={shared} />;
}
