import type { PlantSpeciesProfile } from "@plantopedia/contracts";
import { usePreferences } from "../../theme/preferences";
import type { CopyKey } from "../../i18n/locales/en";
const names: Record<string, string> = {
  ncsu_helianthus_annuus: "sunflower",
  ncsu_echinacea_purpurea: "coneflower",
  ncsu_asclepias_syriaca: "milkweed",
  ncsu_wisteria_sinensis: "wisteria",
  ncsu_ginkgo_biloba: "ginkgo",
};
export function localizedSpecies(
  profile: PlantSpeciesProfile,
  t: ReturnType<typeof usePreferences>["t"],
): PlantSpeciesProfile {
  const key = names[profile.species.id];
  if (!key) return profile;
  const copy = (suffix: string) => t(`${key}_${suffix}` as CopyKey);
  const sun =
    key === "coneflower" || key === "wisteria" ? t("partial_sun") : copy("sun");
  return {
    ...profile,
    species: { ...profile.species, commonName: copy("name") },
    traits: profile.traits.map((trait) => ({
      ...trait,
      text: copy(trait.kind),
    })),
    care: {
      ...profile.care,
      ...(profile.care.water ? { water: copy("water") } : {}),
      ...(profile.care.sun ? { sun } : {}),
    },
    ...(profile.caution ? { caution: copy("caution") } : {}),
  };
}
