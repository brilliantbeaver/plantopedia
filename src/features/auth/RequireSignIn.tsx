import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { useSessionApi } from "../../services/session";
import { usePreferences } from "../../theme/preferences";
import { Screen, Action } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { SignInPrompt } from "./SignInPrompt";

export function RequireSignIn({
  children,
  returnTo,
}: {
  children: ReactNode;
  returnTo?: string;
}) {
  const { kind } = useSessionApi();
  const { t } = usePreferences();
  const router = useRouter();
  if (kind !== "guest") return children;
  return (
    <Screen vivid>
      <PageHeader
        title={t(
          returnTo === "/scan"
            ? "scan"
            : returnTo === "/ask"
              ? "ask"
              : returnTo === "/progress"
                ? "questsAvatar"
                : "myGarden",
        )}
        back
      />
      <SignInPrompt returnTo={returnTo} />
      <Action
        secondary
        title={t("searchPlants")}
        icon="search"
        onPress={() => router.push("/search")}
      />
    </Screen>
  );
}
