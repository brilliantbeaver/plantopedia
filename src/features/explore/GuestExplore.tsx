import { JourneyHero } from "../journey/Journey";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Copy, Action, Field, IconButton } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { GlassSurface } from "../../theme/GlassSurface";
import { usePreferences } from "../../theme/preferences";
import { SignInPrompt } from "../auth/SignInPrompt";

export function GuestExplore() {
  const { t } = usePreferences();
  const router = useRouter();
  const [text, setText] = useState("");
  function search() {
    router.push({ pathname: "/search", params: { q: text.trim() } });
  }
  return (
    <Screen vivid>
      <PageHeader
        title="Plantopedia"
        subtitle={t("tagline")}
        icon="leaf"
        actions={
          <IconButton
            icon="settings-outline"
            label={t("settings")}
            onPress={() => router.push("/settings")}
          />
        }
      />
      <JourneyHero />
      <GlassSurface style={{ gap: 12 }}>
        <Copy muted>{t("guestMode")}</Copy>
        <Copy large>{t("searchPlants")}</Copy>
        <Field
          value={text}
          onChangeText={setText}
          placeholder={t("guestSearchPlaceholder")}
          accessibilityLabel={t("searchPlants")}
          maxLength={120}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <Action title={t("searchPlants")} icon="search" onPress={search} />
      </GlassSurface>
      <SignInPrompt compact returnTo="/explore" />
    </Screen>
  );
}
