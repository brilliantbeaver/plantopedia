import { Platform } from "react-native";
import { Stack } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { publicConfig } from "../config/public-env";
import { webAuthConfigurationError } from "../config/web-auth";
import { PreferencesProvider, usePreferences } from "../theme/preferences";
import { SessionProvider, GuestSessionProvider } from "../services/session";
import { ProgressBootstrap } from "../features/rewards/Progress";
import { DeletionProvider } from "../features/garden/DeletionProvider";
import { Screen, Feedback } from "../components/ui";
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
  if (!isSignedIn) return <GuestExperience />;
  return (
    <SessionProvider key={userId}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <DeletionProvider>
        <ProgressBootstrap />
        <Stack screenOptions={{ headerShown: false }} />
      </DeletionProvider>
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
            <GuestExperience />
          )}
        </QueryClientProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

function GuestExperience() {
  return (
    <GuestSessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GuestSessionProvider>
  );
}
