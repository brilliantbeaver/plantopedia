import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Action, Copy } from "../../components/ui";
import { GlassSurface } from "../../theme/GlassSurface";
import { AppIcon, IconBadge } from "../../components/AppIcon";
import { usePreferences } from "../../theme/preferences";

export function SignInPrompt({
  compact = false,
  saving = false,
  returnTo,
}: {
  compact?: boolean;
  saving?: boolean;
  returnTo?: string | undefined;
}) {
  const { t, colors } = usePreferences();
  const router = useRouter();
  return (
    <GlassSurface
      tint="botanical"
      style={{ gap: compact ? 12 : 20, padding: compact ? 20 : 24 }}
    >
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <IconBadge name={saving ? "bookmark-outline" : "leaf-outline"} />
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            { color: colors.text, fontSize: compact ? 20 : 27 },
          ]}
        >
          {t(saving ? "guestSearchTitle" : "guestTitle")}
        </Text>
      </View>
      <Copy muted>{t(compact ? "guestSearchBody" : "guestBody")}</Copy>
      <Action
        title={t("authSignIn")}
        icon="arrow-forward"
        onPress={() =>
          router.push(
            returnTo ? { pathname: "/login", params: { returnTo } } : "/login",
          )
        }
      />
      {!compact && (
        <View
          style={{
            flexDirection: "row",
            gap: 7,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <AppIcon
            name="lock-closed-outline"
            size={14}
            color={colors.secondary}
          />
          <Text style={[styles.privacy, { color: colors.secondary }]}>
            {t("guestPrivacy")}
          </Text>
        </View>
      )}
    </GlassSurface>
  );
}
const styles = StyleSheet.create({
  title: { flex: 1, fontWeight: "700", letterSpacing: -0.5 },
  privacy: { flexShrink: 1, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
