import { View, StyleSheet, type ViewProps } from "react-native";
import { usePreferences } from "./preferences";
export type GlassSurfaceProps = ViewProps & { tint?: "botanical" | undefined };
export function GlassSurface({ style, tint, ...props }: GlassSurfaceProps) {
  const { colors, mode } = usePreferences();
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
        style,
      ]}
    />
  );
}
export const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 24, padding: 16 },
});
