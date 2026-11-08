import type { ApiClient } from "../../services/api";
import { gardenData } from "../../services/garden-data";
import {
  findSpecies,
  lowEvidence,
  type PlantDetail,
  type AnimalIdentification,
} from "@plantopedia/contracts";
import { advanceDay, applyRewards, purchase, startProgress } from "./rules";
export function deviceZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
export async function settleRewards(
  owner: string,
  api: ApiClient,
  now = Date.now(),
  zone = deviceZone(),
) {
  return gardenData.update(owner, api, (d) => {
    const progress = d.progress ?? startProgress(now, zone);
    return {
      ...d,
      progress: applyRewards(progress, d.actions, now, zone).progress,
    };
  });
}
export async function rewardDiscovery(
  owner: string,
  api: ApiClient,
  speciesId: string,
  evidenceId: string,
) {
  // A single evidence receipt is immutable even if an identification is corrected.
  await gardenData.update(owner, api, (d) => {
    const progress = advanceDay(
      d.progress ?? startProgress(Date.now(), deviceZone()),
      Date.now(),
      deviceZone(),
    );
    const id = `discovery_${evidenceId}${evidenceId.startsWith("catalog_") ? `_${progress.day.key}` : ""}`;
    const actions = d.actions.some((a) => a.id === id)
      ? d.actions
      : [
          ...d.actions,
          {
            id,
            kind: "discovery" as const,
            speciesId,
            plantId: null,
            createdAt: new Date().toISOString(),
            acknowledged: true,
            text: "",
          },
        ];
    return {
      ...d,
      actions,
      progress: applyRewards(progress, actions, Date.now(), deviceZone())
        .progress,
    };
  });
}
export async function buyAvatar(owner: string, api: ApiClient, id: string) {
  await gardenData.update(owner, api, (d) => ({
    ...d,
    progress: purchase(
      d.progress ?? startProgress(Date.now(), deviceZone()),
      id,
    ),
  }));
}

// Persist intent before the remote selection so a lost acknowledgment can be
// reconciled against its exact recorded revision, without scanning old history.
export async function stagePhotoDiscovery(
  owner: string,
  api: ApiClient,
  detail: PlantDetail,
  input: {
    identificationId: string;
    candidateIndex: number | null;
    revision: number;
  },
) {
  const evidence = detail.identifications.find(
    (i) => i.id === input.identificationId,
  );
  const candidate =
    input.candidateIndex === 0 ? evidence?.candidates[0] : undefined;
  if (
    !evidence ||
    !candidate ||
    evidence.provider === "openai_vision" ||
    candidate.assessment === "visual_guess" ||
    evidence.needsMoreEvidence ||
    lowEvidence(evidence.candidates)
  )
    return null;
  const speciesId =
    findSpecies(candidate.scientificName)?.species.id ??
    (candidate.taxonId && /^\d+$/.test(candidate.taxonId)
      ? `plant:gbif:${candidate.taxonId}`
      : null);
  if (!speciesId) return null;
  const evidenceKey = "photo_" + evidence.photoIds.slice().sort().join("_");
  const id =
    "discovery_" +
    evidenceKey +
    "_" +
    input.identificationId +
    "_" +
    input.revision;
  const now = Date.now();
  await gardenData.update(owner, api, (d) => ({
    ...d,
    progress: d.progress ?? startProgress(now, deviceZone()),
    actions: d.actions.some((a) => a.id === id)
      ? d.actions
      : [
          ...d.actions,
          {
            id,
            kind: "discovery",
            evidenceKey,
            speciesId,
            plantId: detail.plant.id,
            createdAt: new Date(now).toISOString(),
            acknowledged: false,
            text: "",
            selection: {
              ...input,
              candidateIndex: 0,
              scientificName: candidate.scientificName,
            },
          },
        ],
  }));
  return id;
}
export async function acknowledgeRewardAction(
  owner: string,
  api: ApiClient,
  id: string,
) {
  await gardenData.update(owner, api, (d) => {
    const actions = d.actions.map((a) =>
      a.id === id ? { ...a, acknowledged: true } : a,
    );
    return {
      ...d,
      actions,
      progress: applyRewards(
        d.progress ?? startProgress(Date.now(), deviceZone()),
        actions,
        Date.now(),
        deviceZone(),
      ).progress,
    };
  });
}

export async function stageAnimalDiscovery(
  owner: string,
  api: ApiClient,
  draftId: string,
) {
  const id = `animal_${draftId}`,
    now = Date.now();
  await gardenData.update(owner, api, (d) => ({
    ...d,
    progress: d.progress ?? startProgress(now, deviceZone()),
    actions: d.actions.some((a) => a.id === id)
      ? d.actions
      : [
          ...d.actions,
          {
            id,
            kind: "animal",
            speciesId: "",
            plantId: null,
            createdAt: new Date(now).toISOString(),
            acknowledged: false,
            text: "",
          },
        ],
  }));
}
export async function completeAnimalDiscovery(
  owner: string,
  api: ApiClient,
  draftId: string,
  result: AnimalIdentification,
) {
  const id = `animal_${draftId}`;
  await gardenData.update(owner, api, (d) => {
    const actions = d.actions.map((a) =>
      a.id === id && !a.acknowledged
        ? {
            ...a,
            acknowledged: true,
            speciesId:
              result.verdict === "pollinator" ? (result.speciesId ?? "") : "",
          }
        : a,
    );
    return {
      ...d,
      actions,
      progress: applyRewards(
        d.progress ?? startProgress(Date.now(), deviceZone()),
        actions,
        Date.now(),
        deviceZone(),
      ).progress,
    };
  });
}
