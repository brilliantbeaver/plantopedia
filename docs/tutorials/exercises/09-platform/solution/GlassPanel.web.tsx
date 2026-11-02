import { useEffect, useState } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
export function GlassPanel({ style, ...props }: ViewProps) {
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const contrast = window.matchMedia("(prefers-contrast: more)");
    const update = () => setOpaque(reduce.matches || contrast.matches || !CSS.supports("backdrop-filter", "blur(1px)"));
    update(); reduce.addEventListener("change", update); contrast.addEventListener("change", update);
    return () => { reduce.removeEventListener("change", update); contrast.removeEventListener("change", update); };
  }, []);
  const glass: ViewStyle & { backdropFilter?: string } = opaque ? {} : { backgroundColor: "rgba(245,255,249,0.90)", backdropFilter: "blur(20px) saturate(140%)" };
  return <View {...props} style={[{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#83a99a", backgroundColor: "#f5fff9" }, glass, style]} />;
}
