import { View, type ViewProps } from "react-native";
// Android and other platforms receive an opaque, readable surface.
export function GlassPanel({ style, ...props }: ViewProps) {
  return <View {...props} style={[{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#83a99a", backgroundColor: "#f5fff9" }, style]} />;
}
