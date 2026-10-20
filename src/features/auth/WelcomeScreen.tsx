import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppIcon } from "../../components/AppIcon";
import { usePreferences } from "../../theme/preferences";
import { SignIn } from "./sign-in";

export function WelcomeScreen() {
  const { colors, mode, t } = usePreferences();
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 960 && fontScale < 1.5;
  const compact = width < 600;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.page, { padding: compact ? 16 : 32 }]}
        >
          <View style={[styles.container, { maxWidth: wide ? 1080 : 560 }]}>
            <View style={styles.brand}>
              <View
                style={[styles.brandMark, { backgroundColor: colors.primary }]}
              >
                <AppIcon name="leaf" size={23} color={colors.onPrimary} />
              </View>
              <View style={styles.brandText}>
                <Text style={[styles.wordmark, { color: colors.text }]}>
                  Plantopedia
                </Text>
                <Text style={[styles.tagline, { color: colors.secondary }]}>
                  {t("tagline")}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.shell,
                {
                  flexDirection: wide ? "row" : "column",
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <ImageBackground
                source={require("../../../assets/images/botanical.png")}
                resizeMode="cover"
                imageStyle={{ width: "100%", height: "100%" }}
                accessible={false}
                style={[
                  styles.botanical,
                  wide ? { width: "46%", minHeight: 540 } : { width: "100%" },
                ]}
              >
                <View
                  style={[styles.introduction, { padding: wide ? 40 : 28 }]}
                >
                  <Text
                    accessibilityRole="header"
                    style={[
                      styles.title,
                      { fontSize: wide ? 44 : 32, lineHeight: wide ? 50 : 38 },
                    ]}
                  >
                    {t("welcome")}
                  </Text>
                  <Text style={styles.description}>{t("authIntro")}</Text>
                </View>
              </ImageBackground>

              <View
                style={[
                  styles.signInPanel,
                  {
                    padding: compact ? 20 : wide ? 40 : 32,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View style={styles.form}>
                  {Platform.OS !== "web" && (
                    <Text
                      accessibilityRole="header"
                      style={[styles.formTitle, { color: colors.text }]}
                    >
                      {t("signIn")}
                    </Text>
                  )}
                  <SignIn />
                </View>
                <View
                  style={[styles.privacy, { borderTopColor: colors.border }]}
                >
                  <AppIcon
                    name="shield-checkmark-outline"
                    size={18}
                    color={colors.secondary}
                  />
                  <Text
                    style={[styles.privacyText, { color: colors.secondary }]}
                  >
                    {t("authPrivate")}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.note, { color: colors.secondary }]}>
              {t("ai")}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  container: { width: "100%", gap: 24 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { flex: 1, gap: 3 },
  wordmark: { fontSize: 24, fontWeight: "700", letterSpacing: -0.8 },
  tagline: { fontSize: 13, lineHeight: 19 },
  shell: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 16px 56px rgba(16, 42, 26, 0.08)",
  },
  botanical: {
    backgroundColor: "#173C28",
    minHeight: 224,
    overflow: "hidden",
  },
  introduction: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 16,
    backgroundColor: "rgba(9, 31, 18, 0.45)",
  },
  title: { color: "#FFFFFF", fontWeight: "700", letterSpacing: -1.2 },
  description: {
    color: "#E1EEDF",
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 350,
  },
  signInPanel: { flex: 1, minWidth: 0, justifyContent: "center", gap: 28 },
  form: { width: "100%", gap: 24 },
  formTitle: { fontSize: 23, fontWeight: "600", lineHeight: 30 },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 20,
  },
  privacyText: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
  note: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
