import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";
import { publicConfig } from "../config/public-env";
import { WelcomeScreen } from "../features/auth/WelcomeScreen";
import { Screen, Copy } from "../components/ui";
import { usePreferences } from "../theme/preferences";
import { safeReturnTo } from "../features/auth/return-to";
import { Platform } from "react-native";
import { webAuthConfigurationError } from "../config/web-auth";
export default function Login({
  defaultReturnTo = "/plants",
}: { defaultReturnTo?: string } = {}) {
  const { t } = usePreferences();
  const webError =
    publicConfig.success &&
    Platform.OS === "web" &&
    typeof window !== "undefined"
      ? webAuthConfigurationError(
          publicConfig.data.clerkPublishableKey,
          window.location.hostname,
        )
      : null;
  return publicConfig.success && !webError ? (
    <ConfiguredLogin defaultReturnTo={defaultReturnTo} />
  ) : (
    <Screen>
      <Copy>{t("configuration")}</Copy>
    </Screen>
  );
}
function ConfiguredLogin({ defaultReturnTo }: { defaultReturnTo: string }) {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { isSignedIn } = useAuth();
  const resume = safeReturnTo(returnTo ?? defaultReturnTo);
  return isSignedIn ? (
    <Redirect href={resume as Href} />
  ) : (
    <WelcomeScreen returnTo={resume} />
  );
}
