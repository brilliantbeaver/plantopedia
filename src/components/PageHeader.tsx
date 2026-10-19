import type { ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { usePreferences } from "../theme/preferences";
import { IconButton } from "./ui";
import { IconBadge, type IconName } from "./AppIcon";

export function PageHeader({
  title,
  subtitle,
  back = false,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: boolean;
  icon?: IconName;
  actions?: ReactNode;
}) {
  const { colors, t } = usePreferences();
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <View style={header.row}>
        {back ? (
          <IconButton
            icon="arrow-back"
            label={t("back")}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
        ) : icon ? (
          <IconBadge name={icon} />
        ) : null}
        <Text
          accessibilityRole="header"
          style={[header.title, { color: colors.text }]}
        >
          {title}
        </Text>
        {actions}
      </View>
      {subtitle ? (
        <Text style={[header.subtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
const header = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.5,
    fontWeight: "700",
  },
  subtitle: { fontSize: 15, lineHeight: 22 },
});
