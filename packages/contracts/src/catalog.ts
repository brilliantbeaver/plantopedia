import { PlantSpeciesProfile } from "./pollinators.js";
const source = (id: string) => `https://plants.ces.ncsu.edu/plants/${id}/`;
// Factual paraphrases; regional bloom/size examples, not universal guarantees.
// Reviewed 2026-11-01. Each entry uses the single cited Extension page.
export const catalog = PlantSpeciesProfile.array().parse([
  {
    species: {
      id: "ncsu_helianthus_annuus",
      scientificName: "Helianthus annuus",
      commonName: "Sunflower",
      aliases: ["common sunflower", "wild sunflower"],
    },
    lifeCycleType: "annual",
    pollinatorValue: "supported",
    visitors: ["bee", "butterfly"],
    traits: [
      { kind: "flower", text: "Yellow flower rays around a dark center" },
      { kind: "leaf", text: "Rough, toothed leaves" },
      { kind: "height", text: "Usually 2–10 ft (0.6–3 m) tall" },
      { kind: "bloom", text: "Summer into fall; varies by climate" },
    ],
    care: {
      water:
        "Keep soil moist while establishing; established plants tolerate some dry soil. Check before watering.",
      waterNeed: "medium",
      sun: "Full sun; about 6 or more hours of direct light.",
    },
    sourceUrl: source("helianthus-annuus"),
  },
  {
    species: {
      id: "ncsu_echinacea_purpurea",
      scientificName: "Echinacea purpurea",
      commonName: "Purple coneflower",
      aliases: ["coneflower", "eastern purple coneflower"],
    },
    lifeCycleType: "perennial",
    pollinatorValue: "supported",
    visitors: ["bee", "butterfly"],
    traits: [
      { kind: "flower", text: "Purple petals around a raised brown cone" },
      { kind: "leaf", text: "Rough leaves" },
      { kind: "height", text: "Often 3–4 ft (0.9–1.2 m) tall" },
      { kind: "habit", text: "Upright herbaceous perennial" },
    ],
    care: {
      water:
        "Moist, well-drained soil; tolerates dry spells once established. Check the soil first.",
      waterNeed: "medium",
      sun: "Full sun to partial shade.",
    },
    sourceUrl: source("echinacea-purpurea"),
  },
  {
    species: {
      id: "ncsu_asclepias_syriaca",
      scientificName: "Asclepias syriaca",
      commonName: "Common milkweed",
      aliases: ["milkweed", "Asclepias apocinum"],
    },
    lifeCycleType: "perennial",
    pollinatorValue: "supported",
    visitors: ["bee", "butterfly"],
    traits: [
      { kind: "flower", text: "Rounded clusters of pinkish fragrant flowers" },
      { kind: "leaf", text: "Opposite, oblong leaves" },
      { kind: "height", text: "Often 3–5 ft (0.9–1.5 m) tall" },
      { kind: "bloom", text: "Summer; timing varies by region" },
    ],
    care: {
      water:
        "Average, well-drained soil; can tolerate dry soil once established.",
      waterNeed: "low",
      sun: "Full sun; does not tolerate shade.",
    },
    caution:
      "Can spread widely. Plant only where regionally appropriate. Sap and plant parts can be harmful; do not taste or handle broken stems.",
    sourceUrl: source("asclepias-syriaca"),
  },
  {
    species: {
      id: "ncsu_wisteria_sinensis",
      scientificName: "Wisteria sinensis",
      commonName: "Chinese wisteria",
      aliases: ["wisteria"],
    },
    lifeCycleType: "perennial",
    pollinatorValue: "unknown",
    visitors: [],
    traits: [
      { kind: "flower", text: "Hanging chains of blue-violet flowers" },
      { kind: "leaf", text: "Compound leaves with multiple leaflets" },
      { kind: "habit", text: "Woody, counterclockwise twining vine" },
      { kind: "bloom", text: "Spring flowers" },
    ],
    care: { sun: "Full sun to partial shade." },
    caution:
      "Invasive in North Carolina and other areas. Check your regional invasive-plant guidance before planting; consider a locally suitable alternative.",
    sourceUrl: source("wisteria-sinensis"),
  },
  {
    species: {
      id: "ncsu_ginkgo_biloba",
      scientificName: "Ginkgo biloba",
      commonName: "Ginkgo",
      aliases: ["maidenhair tree"],
    },
    lifeCycleType: "perennial",
    pollinatorValue: "unknown",
    visitors: [],
    traits: [
      { kind: "leaf", text: "Distinctive fan-shaped leaves" },
      { kind: "height", text: "Often 50–80 ft (15–24 m) tall" },
      { kind: "habit", text: "Deciduous tree with golden fall leaves" },
    ],
    care: {
      water: "Good drainage is essential; avoid wet soils.",
      waterNeed: "low",
      sun: "Full sun.",
    },
    sourceUrl: source("ginkgo-biloba"),
  },
]);
export function findSpecies(value?: string | null) {
  if (typeof value!=="string"||!value||value.length>160) return undefined;
  const key = normalize(value);
  return catalog.find((p) =>
    [
      p.species.id,
      p.species.scientificName,
      p.species.commonName,
      ...p.species.aliases,
    ].some((x) => normalize(x) === key),
  );
}
function normalize(s: string) {
  return s.normalize("NFKC").toLocaleLowerCase().trim();
}
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        (next[j - 1] ?? 0) + 1,
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length] ?? 0;
}
export function searchCatalog(input: string) {
  const term = normalize(input).slice(0, 120);
  if (!term) return [];
  return catalog
    .map((p) => ({
      p,
      score: Math.min(
        ...[
          p.species.scientificName,
          p.species.commonName,
          ...p.species.aliases,
        ].map((n) => {
          const name = normalize(n);
          return name.includes(term)
            ? 0
            : term.length >= 4
              ? distance(term, name)
              : 99;
        }),
      ),
    }))
    .filter((x) => x.score <= Math.min(2, Math.floor(term.length / 4)))
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)
    .map((x) => x.p);
}
