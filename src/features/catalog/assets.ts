import type { ImageSourcePropType } from "react-native";
import attribution from "../../../assets/images/species/attribution.json";
export const referencePhotos: Record<string, ImageSourcePropType> = {
  ncsu_helianthus_annuus: require("../../../assets/images/species/helianthus-annuus.jpg"),
  ncsu_echinacea_purpurea: require("../../../assets/images/species/echinacea-purpurea.jpg"),
  ncsu_asclepias_syriaca: require("../../../assets/images/species/asclepias-syriaca.jpg"),
  ncsu_wisteria_sinensis: require("../../../assets/images/species/wisteria-sinensis.jpg"),
  ncsu_ginkgo_biloba: require("../../../assets/images/species/ginkgo-biloba.jpg"),
};
export function photoCredit(id: string) {
  return Object.values(attribution).find(
    (x) => `ncsu_${x.uri.replaceAll("-", "_")}` === id,
  );
}
