import { View, type ViewProps } from "react-native";
export function GlassPanel({ style, ...props }: ViewProps) {
  // TODO: retain this readable fallback and add .ios.tsx and .web.tsx adapters.
  // Start with opaque content until capability and preference checks complete.
  return <View {...props} style={[{ padding: 20, backgroundColor: "#f5fff9" }, style]} />;
}
