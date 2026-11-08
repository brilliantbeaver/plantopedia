import { applyRewards, startProgress } from "../rewards/rules";
import {
  acknowledgeRewardAction,
  completeAnimalDiscovery,
  deviceZone,
  settleRewards,
} from "../rewards/service";
import { randomUUID } from "expo-crypto";
import { type PlantSpeciesProfile, findSpecies } from "@plantopedia/contracts";
import type { ApiClient } from "../../services/api";
import { featureStorage } from "../../services/feature-storage";
import { deletionQueue } from "./deletion";
import { local } from "../../services/local";
import { gardenData, type GardenAction } from "../../services/garden-data";
export async function saveSpecies(
  owner: string,
  api: ApiClient,
  profile: PlantSpeciesProfile,
) {
  const all = await api.plants();
  const existing = all.items.find(
    (p) =>
      p.speciesId === profile.species.id ||
      findSpecies(p.scientificName)?.species.id === profile.species.id,
  );
  if (existing) return existing;
  const data = await gardenData.update(owner, api, (d) => ({
    ...d,
    catalogSaves: {
      ...d.catalogSaves,
      [profile.species.id]: d.catalogSaves[profile.species.id] ?? {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      },
    },
  }));
  const { id, createdAt } = data.catalogSaves[profile.species.id]!;
  // Frozen deterministic input allows recovery after a lost create reply.
  return api.createPlant(
    {
      id,
      nickname: profile.species.commonName,
      ownership: "observed",
      capturedAt: createdAt,
      place: "",
      speciesId: profile.species.id,
    },
    `catalog_${id}`,
  );
}
export async function recordGardenAction(
  owner: string,
  api: ApiClient,
  profile: PlantSpeciesProfile,
  kind: "planting" | "care",
  text: string,
  existingPlantId?: string,
) {
  const baseline = await settleRewards(owner, api);
  const p = existingPlantId
    ? { id: existingPlantId }
    : await saveSpecies(owner, api, profile);
  const day = baseline.progress!.day.key;
  const key =
    kind === "planting"
      ? `planting_${profile.species.id}`
      : `care_${p.id}_${day}`;
  let pending: GardenAction;
  const saved = await gardenData.update(owner, api, (d) => {
    const previous = d.actions.find((x) => x.id === key);
    pending = previous ?? {
      id: key,
      kind,
      speciesId: profile.species.id,
      plantId: p.id,
      createdAt: new Date().toISOString(),
      acknowledged: false,
      text,
      // No supported region verifies Chinese wisteria's local suitability.
      // Recording an existing activity is allowed, but never incentivize planting it.
      plantingEligible: profile.species.scientificName !== "Wisteria sinensis",
      careKey:
        d.catalogSaves[profile.species.id]?.id === p.id
          ? profile.species.id
          : p.id,
    };
    if (previous) {
      if (
        kind === "planting" &&
        !previous.acknowledged &&
        profile.species.scientificName === "Wisteria sinensis"
      )
        return {
          ...d,
          actions: d.actions.map((a) =>
            a.id === key ? { ...a, plantingEligible: false } : a,
          ),
        };
      return d;
    }
    return { ...d, actions: [...d.actions, pending] };
  });
  const action = saved.actions.find((a) => a.id === key)!;
  if (!action.acknowledged) {
    await api.observe(
      p.id,
      {
        id: key,
        capturedAt: action.createdAt,
        text: action.text,
        kind: "care_event",
      },
      key,
    );
    await gardenData.update(owner, api, (d) => {
      const actions = d.actions.map((a) =>
        a.id === key ? { ...a, acknowledged: true } : a,
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
  return p.id;
}

export async function recoverGardenActions(
  owner: string,
  api: ApiClient,
  active: () => boolean,
) {
  for (const action of (await gardenData.read(owner, api)).actions) {
    if (!active()) return;
    if (!action.acknowledged && action.kind === "animal") {
      const draft = (await local.drafts(owner)).find(
        (d) => action.id === "animal_" + d.id,
      );
      if (active() && draft?.animalResult)
        await completeAnimalDiscovery(owner, api, draft.id, draft.animalResult);
      continue;
    }
    if (
      !action.acknowledged &&
      action.kind === "discovery" &&
      action.selection &&
      action.plantId
    ) {
      if (
        (await deletionQueue(owner, featureStorage).list()).some(
          (item) => item.id === action.plantId,
        )
      )
        continue;
      try {
        const detail = await api.plant(action.plantId);
        const intent = action.selection;
        if (
          active() &&
          detail.selections.some(
            (s) =>
              s.identificationId === intent.identificationId &&
              s.candidateIndex === intent.candidateIndex &&
              s.supersedesRevision === intent.revision &&
              s.scientificName === intent.scientificName,
          )
        )
          await acknowledgeRewardAction(owner, api, action.id);
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "status" in error
            ? Number(error.status)
            : 0;
        if (![404, 410].includes(status)) throw error;
        if (active())
          await gardenData.update(owner, api, (d) => ({
            ...d,
            actions: d.actions.filter((a) => a.id !== action.id),
          }));
      }
      continue;
    }
    if (
      !action.acknowledged &&
      action.plantId &&
      (action.kind === "care" || action.kind === "planting")
    ) {
      if (
        (await deletionQueue(owner, featureStorage).list()).some(
          (item) => item.id === action.plantId,
        )
      )
        continue;
      try {
        await api.observe(
          action.plantId,
          {
            id: action.id,
            capturedAt: action.createdAt,
            text: action.text,
            kind: "care_event",
          },
          action.id,
        );
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "status" in error
            ? Number(error.status)
            : 0;
        if (![404, 410].includes(status)) throw error;
        // A deleted specimen cannot acknowledge an action; never credit it.
        if (active())
          await gardenData.update(owner, api, (d) => ({
            ...d,
            actions: d.actions.filter((a) => a.id !== action.id),
          }));
        continue;
      }
      if (!active()) return;
      await gardenData.update(owner, api, (d) => ({
        ...d,
        actions: d.actions.map((a) =>
          a.id === action.id
            ? {
                ...a,
                acknowledged: true,
                plantingEligible:
                  a.kind === "planting" &&
                  findSpecies(a.speciesId)?.species.scientificName ===
                    "Wisteria sinensis"
                    ? false
                    : a.plantingEligible,
              }
            : a,
        ),
      }));
    }
  }
}
