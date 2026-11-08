import { RegionChoice } from "../catalog/RegionChoice";
import { useEffect, useRef, useState } from "react";
import { Image, Linking, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { type AnimalIdentification, findSpecies } from "@plantopedia/contracts";
import { Action, Card, Copy, Disclosure, Feedback } from "../../components/ui";
import { AppIcon } from "../../components/AppIcon";
import { usePreferences, designTokens } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { local, type Draft } from "../../services/local";
import { gardenData } from "../../services/garden-data";
import { applyRewards, startProgress } from "../rewards/rules";
import {
  deviceZone,
  stageAnimalDiscovery,
  completeAnimalDiscovery,
} from "../rewards/service";
import { identifyPhoto } from "../capture/public-identification";
export function BugResult({ result }: { result: AnimalIdentification }) {
  const { t, colors } = usePreferences();
  const router = useRouter();
  const status =
    result.verdict === "pollinator"
      ? "pollinatorVerdict"
      : result.verdict === "not_pollinator"
        ? "notPollinatorVerdict"
        : "uncertainVerdict";
  return (
    <View style={{ gap: designTokens.spacing.medium }}>
      <Copy large>
        {result.commonName ?? result.scientificName ?? t("uncertainVerdict")}
      </Copy>
      {result.commonName && result.scientificName && (
        <Copy muted>{result.scientificName}</Copy>
      )}
      <Card>
        <AppIcon
          name={
            result.verdict === "pollinator"
              ? "checkmark-circle"
              : result.verdict === "not_pollinator"
                ? "remove-circle-outline"
                : "help-circle"
          }
          size={40}
          color={colors.primary}
        />
        <Copy large>{t(status)}</Copy>
        <Copy>{t(result.speciesId ? "likelyMatch" : "bestGuess")}</Copy>
        {result.provider.startsWith("openai_vision") && (
          <Copy muted>{t("visionFallback")}</Copy>
        )}
      </Card>
      {result.canSting !== "unknown" && (
        <Card>
          <AppIcon name="warning-outline" color={colors.warning} />
          <Copy>
            {t(result.canSting === "yes" ? "stingWarning" : "maySting")}
          </Copy>
        </Card>
      )}
      <Disclosure title={t("plantsVisited")} icon="flower-outline">
        <RegionChoice />
        <Copy muted>{t("localUnknown")}</Copy>
        {result.fact && (
          <Copy>
            {result.scientificName === "Apis mellifera"
              ? t("honeyBeeFact")
              : result.fact}
          </Copy>
        )}
        {result.plants.map((id) => {
          const plant = findSpecies(id);
          return (
            <Action
              secondary
              icon="leaf-outline"
              key={id}
              title={plant?.species.commonName ?? id}
              onPress={() =>
                plant
                  ? router.push({
                      pathname: "/species/[speciesId]",
                      params: { speciesId: plant.species.id },
                    })
                  : router.push({ pathname: "/search", params: { q: id } })
              }
            />
          );
        })}
        {!result.plants.length && <Copy>{t("pollinatorUnknown")}</Copy>}
        {result.sourceUrl && (
          <Action
            secondary
            title={t("source")}
            onPress={() => void Linking.openURL(result.sourceUrl!)}
          />
        )}
      </Disclosure>
    </View>
  );
}
export function BugDraft({
  draft,
  onChange,
  onClose,
  onRetake,
}: {
  draft: Draft;
  onChange(draft: Draft): void;
  onClose(): void;
  onRetake(): void;
}) {
  const { owner, api } = useSessionApi();
  const { t, preferences } = usePreferences();
  const query = useQueryClient();
  const router = useRouter();
  const consent = useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const controller = useRef(new AbortController());
  const lock = useRef(false);
  useEffect(() => {
    controller.current = new AbortController();
    return () => controller.current.abort();
  }, []);
  async function identify(approve = false) {
    if (lock.current || !draft.derivative) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (approve)
        await gardenData.update(owner, api, (d) => ({
          ...d,
          uploadConsent: true,
        }));
      const frozen = {
        ...draft,
        submittedAt: draft.submittedAt ?? new Date().toISOString(),
      };
      await local.save(frozen);
      onChange(frozen);
      await stageAnimalDiscovery(owner, api, draft.id);
      const result = await identifyPhoto(
        api,
        "bug",
        draft.derivative,
        draft.id,
        preferences.locale,
        controller.current.signal,
      );
      if (result.mode !== "bug") throw new Error("provider_contract");
      const next = { ...frozen, animalResult: result.identification };
      await local.save(next);
      await completeAnimalDiscovery(
        owner,
        api,
        draft.id,
        result.identification,
      );
      await query.invalidateQueries({ queryKey: [owner, "garden-metadata"] });
      if (!controller.current.signal.aborted) onChange(next);
    } catch (e) {
      if (!controller.current.signal.aborted) setError(e);
    } finally {
      lock.current = false;
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await gardenData.update(owner, api, (d) => {
        const sightings = d.sightings.some((s) => s.id === draft.id)
          ? d.sightings.map((s) =>
              s.id === draft.id
                ? { ...s, identification: draft.animalResult ?? null }
                : s,
            )
          : [
              ...d.sightings,
              {
                id: draft.id,
                photoUri: draft.original,
                capturedAt: draft.capturedAt,
                identification: draft.animalResult ?? null,
                saved: true,
              },
            ];
        const id = `animal_${draft.id}`;
        const qualifying =
          draft.animalResult?.verdict === "pollinator" &&
          draft.animalResult.speciesId;
        const actions =
          qualifying && !d.actions.some((a) => a.id === id)
            ? [
                ...d.actions,
                {
                  id,
                  kind: "animal" as const,
                  speciesId: draft.animalResult!.speciesId!,
                  plantId: null,
                  createdAt: new Date().toISOString(),
                  acknowledged: true,
                  text: "",
                },
              ]
            : d.actions;
        return {
          ...d,
          sightings,
          actions,
          progress: applyRewards(
            d.progress ?? startProgress(Date.now(), deviceZone()),
            actions,
            Date.now(),
            deviceZone(),
          ).progress,
        };
      });
      await local.save({ ...draft, stage: "complete" });
      await query.invalidateQueries({ queryKey: [owner] });
      onClose();
      router.push("/plants");
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <Image
        source={{ uri: draft.original }}
        resizeMode="contain"
        style={{
          width: "100%",
          height: 230,
          borderRadius: designTokens.radius.card,
        }}
        accessibilityLabel={t("photo")}
      />
      {draft.animalResult ? (
        <BugResult result={draft.animalResult} />
      ) : (
        <>
          <Copy>{t("bugTip")}</Copy>
          <Copy>{t("uploadExplain")}</Copy>
          <Action
            icon="scan-outline"
            title={t(
              consent.data?.uploadConsent ? "identifyAnimal" : "uploadApprove",
            )}
            busy={busy}
            disabled={!draft.derivative || consent.isPending}
            onPress={() => void identify(!consent.data?.uploadConsent)}
          />
        </>
      )}
      <Action
        secondary
        icon="bookmark-outline"
        title={t(draft.animalResult ? "saveSighting" : "profileSightingLater")}
        disabled={busy}
        onPress={() => void save()}
      />
      <Action
        secondary
        icon="camera-outline"
        title={t("retake")}
        disabled={busy}
        onPress={onRetake}
      />
      {!!error && <Copy>{t("identifyUnavailable")}</Copy>}
      <Feedback loading={busy} />
    </Card>
  );
}
