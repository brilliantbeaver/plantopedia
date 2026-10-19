import { useState } from "react";
import { Image } from "react-native";
import { Stack } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { publicConfig } from "../config/public-env";
import { PreferencesProvider, usePreferences } from "../theme/preferences";
import { Screen, Copy, Action, Card, Feedback, styles } from "../components/ui";
import { SessionProvider } from "../services/session";
import { useStartSignIn } from "../services/use-start-sign-in";
const query = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
    mutations: { retry: false },
  },
});
function AuthGate() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const startSignIn = useStartSignIn();
  const { t, mode } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (!isLoaded)
    return (
      <Screen>
        <Feedback loading />
      </Screen>
    );
  if (!isSignedIn)
    return (
      <Screen>
        <Copy large>Plantopedia</Copy>
        <Copy muted>{t("tagline")}</Copy>
        <Card>
          <Image
            source={require("../../assets/images/botanical.png")}
            style={styles.photo}
            accessible={false}
          />
          <Copy large>{t("welcome")}</Copy>
          <Copy>{t("privacy")}</Copy>
          <Action
            title={t("signIn")}
            busy={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void startSignIn()
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          />
          <Feedback error={error} />
        </Card>
        <Copy muted>{t("ai")}</Copy>
      </Screen>
    );
  return (
    <SessionProvider key={userId}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <QueryClientProvider client={query}>
          {publicConfig.success ? (
            <ClerkProvider
              publishableKey={publicConfig.data.clerkPublishableKey}
              {...(tokenCache ? { tokenCache } : {})}
            >
              <AuthGate />
            </ClerkProvider>
          ) : (
            <Screen>
              <Copy large>Plantopedia</Copy>
              <Image
                source={require("../../assets/images/botanical.png")}
                style={styles.photo}
                accessible={false}
              />
              <Copy>
                Set EXPO_PUBLIC_API_BASE_URL and
                EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to connect this app.
              </Copy>
            </Screen>
          )}
        </QueryClientProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
