import { View, StyleSheet, type ViewProps } from "react-native";
import { usePreferences } from "./preferences";
export function GlassSurface({ style, ...props }: ViewProps) {
  const { colors } = usePreferences();
  return (
    <View
      {...props}
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    />
  );
}
export const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 24, padding: 16 },
});
