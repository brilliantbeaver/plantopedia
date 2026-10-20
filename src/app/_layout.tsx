import { Image, Platform } from "react-native";
import { Stack } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { publicConfig } from "../config/public-env";
import { webAuthConfigurationError } from "../config/web-auth";
import { PreferencesProvider, usePreferences } from "../theme/preferences";
import { Screen, Copy, Feedback, styles } from "../components/ui";
import { SessionProvider } from "../services/session";
import { WelcomeScreen } from "../features/auth/WelcomeScreen";
const query = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
    mutations: { retry: false },
  },
});
function AuthGate() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { mode } = usePreferences();
  if (!isLoaded)
    return (
      <Screen>
        <Feedback loading />
      </Screen>
    );
  if (!isSignedIn) return <WelcomeScreen />;
  return (
    <SessionProvider key={userId}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
export default function RootLayout() {
  const webAuthError =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    publicConfig.success
      ? webAuthConfigurationError(
          publicConfig.data.clerkPublishableKey,
          window.location.hostname,
        )
      : null;
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <QueryClientProvider client={query}>
          {publicConfig.success && !webAuthError ? (
            <ClerkProvider
              publishableKey={publicConfig.data.clerkPublishableKey}
              {...(Platform.OS === "web"
                ? {
                    signInUrl: "/login",
                    signUpUrl: "/login",
                    signInFallbackRedirectUrl: "/plants",
                    signUpFallbackRedirectUrl: "/plants",
                  }
                : {})}
              {...(publicConfig.data.clerkProxyUrl
                ? { proxyUrl: publicConfig.data.clerkProxyUrl }
                : {})}
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
                {webAuthError ||
                  "Set EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to connect this app."}
              </Copy>
            </Screen>
          )}
        </QueryClientProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
