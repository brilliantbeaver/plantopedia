import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Copy, Action } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { usePreferences } from "../../theme/preferences";
import { findSpecies } from "../../features/catalog/catalog";
import { SpeciesContent } from "../../features/catalog/SpeciesContent";
import { useSessionApi } from "../../services/session";
export default function SpeciesProfile() {
  const { kind } = useSessionApi();
  const { speciesId } = useLocalSearchParams<{ speciesId: string }>();
  const { t } = usePreferences();
  const router = useRouter();
  const profile = findSpecies(speciesId);
  return (
    <Screen vivid={kind === "guest"}>
      <PageHeader title={t("details")} back />
      {profile ? (
        <SpeciesContent profile={profile} showPhoto />
      ) : (
        <>
          <Copy>{t("noCatalogMatch")}</Copy>
          <Action
            title={t("searchPlants")}
            onPress={() => router.push("/search")}
          />
        </>
      )}
    </Screen>
  );
}
