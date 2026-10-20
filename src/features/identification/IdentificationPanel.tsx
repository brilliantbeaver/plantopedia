import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import {
  Plant,
  type PlantDetail,
  type Identification,
} from "@plantopedia/contracts";
import { Action, Copy, Field } from "../../components/ui";
import { CandidateCard } from "../../components/CandidateCard";
import { PrivatePhoto } from "../../components/PrivatePhoto";
import { GlassSurface } from "../../theme/GlassSurface";
import { usePreferences } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { local } from "../../services/local";
import { RequestError } from "../../services/api";

export function IdentificationPanel({
  data,
  focusedPhotoId,
  onPhotoFocus,
}: {
  data: PlantDetail;
  focusedPhotoId: string | null;
  onPhotoFocus(id: string): void;
}) {
  const { api, owner } = useSessionApi();
  const { t, preferences, colors } = usePreferences();
  const query = useQueryClient();
  const queryKey = [owner, "plant", data.plant.id];
  const [editing, setEditing] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [confidenceHelp, setConfidenceHelp] = useState(false);
  const [choosingPhotos, setChoosingPhotos] = useState(false);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const identifyAttempt = useRef<string | null>(null);
  const choiceAttempt = useRef<{ signature: string; key: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const latest = data.identifications
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const chosenEvidence = data.identifications.find(
    (item) => item.id === data.plant.identificationId,
  );
  const evidence =
    data.identifications.find((item) => item.id === evidenceId) ??
    chosenEvidence ??
    latest;
  const hasChoice =
    data.plant.scientificName !== null &&
    data.plant.verification !== "uncertain";
  const picker =
    !choosingPhotos &&
    Boolean(evidence) &&
    (editing || (!hasChoice && !deferred));
  // A manually entered name never inherits a provider's score, even if the
  // string happens to match a candidate from another identification run.
  const chosenSelection = data.selections
    .slice()
    .sort((a, b) => b.supersedesRevision - a.supersedesRevision)
    .find(
      (item) =>
        item.identificationId === data.plant.identificationId &&
        item.scientificName === data.plant.scientificName,
    );
  const recordedCandidate =
    chosenSelection?.candidateIndex != null
      ? chosenEvidence?.candidates[chosenSelection.candidateIndex]
      : undefined;
  const chosenCandidate =
    data.plant.verification === "user_confirmed"
      ? recordedCandidate?.scientificName === data.plant.scientificName
        ? recordedCandidate
        : (chosenEvidence?.candidates.find(
            (item) =>
              item.scientificName === data.plant.scientificName &&
              item.commonNames[0] === data.plant.commonName,
          ) ??
          chosenEvidence?.candidates.find(
            (item) => item.scientificName === data.plant.scientificName,
          ))
      : undefined;
  const ranked =
    evidence?.candidates
      .map((candidate, index) => ({ candidate, index }))
      .sort((a, b) => b.candidate.score - a.candidate.score) ?? [];

  const identify = useMutation({
    retry: false,
    mutationFn: (ids: string[]) =>
      api.identify(
        data.plant.id,
        {
          photoIds: ids,
          organs: ids.map(() => "auto"),
          locale: preferences.locale,
        },
        (identifyAttempt.current ??= randomUUID()),
      ),
    onSuccess: (result) => {
      if (!mounted.current) return;
      query.setQueryData<PlantDetail>(queryKey, (current) =>
        current
          ? {
              ...current,
              identifications: [
                ...current.identifications.filter(
                  (item) => item.id !== result.id,
                ),
                result,
              ],
            }
          : current,
      );
      setEvidenceId(result.id);
      setChoosingPhotos(false);
      setEditing(true);
      setDeferred(false);
      setCompare(false);
      setManualOpen(false);
      setSaved(false);
      identifyAttempt.current = null;
      void query.invalidateQueries({ queryKey });
    },
  });
  const selection = useMutation({
    retry: false,
    mutationFn: (input: {
      identificationId: string;
      candidateIndex: number | null;
      scientificName?: string;
    }) => {
      const body = { revision: data.plant.revision, ...input };
      const signature = JSON.stringify(body);
      if (choiceAttempt.current?.signature !== signature)
        choiceAttempt.current = { signature, key: randomUUID() };
      return api.request(
        `/plants/${data.plant.id}/identification-selection`,
        Plant,
        {
          method: "POST",
          body,
          key: choiceAttempt.current.key,
        },
      );
    },
    onSuccess: (plant) => {
      if (!mounted.current) return;
      query.setQueryData<PlantDetail>(queryKey, (current) =>
        current ? { ...current, plant } : current,
      );
      setEditing(false);
      setDeferred(true);
      setManualOpen(false);
      setManual("");
      setCompare(false);
      setSaved(true);
      // Update the collection and its offline copy from the acknowledged result.
      const current = query.getQueryData<PlantDetail>(queryKey);
      if (current) void local.cache(owner, current).catch(() => undefined);
      void query.invalidateQueries({ queryKey: [owner] });
    },
    onError: (error) => {
      if (!mounted.current) return;
      if (error instanceof RequestError && error.code === "revision_conflict")
        void query.invalidateQueries({ queryKey });
    },
  });
  const busy = identify.isPending || selection.isPending;
  function edit() {
    setEvidenceId(chosenEvidence?.id ?? latest?.id ?? null);
    setEditing(true);
    setChoosingPhotos(false);
    setSaved(false);
    setCompare(false);
    setManualOpen(false);
    selection.reset();
  }
  function choosePhotos() {
    const first =
      focusedPhotoId ?? data.plant.coverPhotoId ?? data.photos[0]?.id;
    setPhotoIds(
      first && data.photos.some((photo) => photo.id === first) ? [first] : [],
    );
    identify.reset();
    identifyAttempt.current = null;
    setChoosingPhotos(true);
    setSaved(false);
  }
  function photosFor(result: Identification | undefined) {
    if (!result) return null;
    return (
      <View style={panel.photoLinks}>
        <Text style={[panel.small, { color: colors.secondary }]}>
          {t("basedOnPhotos")}
        </Text>
        {result.photoIds.map((id) => {
          const index = data.photos.findIndex((photo) => photo.id === id);
          return index < 0 ? null : (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${t("viewPhoto")} ${index + 1}`}
              onPress={() => onPhotoFocus(id)}
              style={({ pressed }) => [
                panel.photoLink,
                { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[panel.small, { color: colors.text }]}>
                {t("photoShort")} {index + 1}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <GlassSurface style={panel.surface}>
      {saved && (
        <View accessibilityLiveRegion="polite">
          <Text style={[panel.saved, { color: colors.primary }]}>
            ✓ {t("identificationSaved")}
          </Text>
        </View>
      )}
      {!picker && !choosingPhotos && (
        <>
          <Text style={[panel.eyebrow, { color: colors.secondary }]}>
            {t("identification")}
          </Text>
          {hasChoice ? (
            <>
              <Text style={[panel.name, { color: colors.text }]}>
                {data.plant.commonName ?? data.plant.scientificName}
              </Text>
              {data.plant.commonName !== null && (
                <Text style={[panel.scientific, { color: colors.secondary }]}>
                  {data.plant.scientificName}
                </Text>
              )}
              <Text style={[panel.small, { color: colors.primary }]}>
                {t("yourChoice")}
                {chosenCandidate
                  ? ` · ${new Intl.NumberFormat(preferences.locale, { style: "percent", maximumFractionDigits: 1 }).format(chosenCandidate.score)} ${t("confidence")}`
                  : data.plant.verification === "user_corrected"
                    ? ` · ${t("manualIdentification")}`
                    : ""}
              </Text>
              {photosFor(chosenEvidence)}
              <Action
                secondary
                title={t("editIdentification")}
                onPress={edit}
              />
            </>
          ) : (
            <>
              <Copy>{t("notIdentified")}</Copy>
              {evidence && (
                <Action
                  title={t("reviewSuggestions")}
                  onPress={() => {
                    setEditing(true);
                    setDeferred(false);
                  }}
                />
              )}
            </>
          )}
          {latest && chosenEvidence && latest.id !== chosenEvidence.id && (
            <Action
              secondary
              title={t("reviewLatest")}
              onPress={() => {
                setEvidenceId(latest.id);
                setEditing(true);
                setSaved(false);
              }}
            />
          )}
          <Action
            secondary={hasChoice || Boolean(evidence)}
            disabled={!data.photos.length}
            title={t("identifyFromPhotos")}
            onPress={choosePhotos}
          />
        </>
      )}
      {choosingPhotos && (
        <>
          <Text
            accessibilityRole="header"
            style={[panel.heading, { color: colors.text }]}
          >
            {t("selectPhotos")}
          </Text>
          <Copy muted>{t("selectPhotosHelp")}</Copy>
          <View style={panel.photoGrid}>
            {data.photos.map((photo, index) => {
              const checked = photoIds.includes(photo.id);
              const disabled = busy || (!checked && photoIds.length >= 5);
              return (
                <Pressable
                  key={photo.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${t("photoShort")} ${index + 1}`}
                  accessibilityState={{ checked, disabled }}
                  disabled={disabled}
                  onPress={() => {
                    setPhotoIds((ids) =>
                      checked
                        ? ids.filter((id) => id !== photo.id)
                        : [...ids, photo.id],
                    );
                    identifyAttempt.current = null;
                  }}
                  style={({ pressed }) => [
                    panel.photoTile,
                    {
                      backgroundColor: colors.muted,
                      borderColor: checked ? colors.primary : colors.border,
                      opacity: disabled && !checked ? 0.5 : pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={panel.thumbnail}>
                    <PrivatePhoto
                      plantId={data.plant.id}
                      photoId={photo.id}
                      style={panel.thumbnailImage}
                    />
                  </View>
                  <Text style={[panel.small, { color: colors.text }]}>
                    {checked ? "✓ " : "○ "}
                    {t("photoShort")} {index + 1}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[panel.small, { color: colors.secondary }]}>
            {photoIds.length} / 5
          </Text>
          <View accessibilityLiveRegion="polite">
            {identify.isPending && <Copy muted>{t("findingMatches")}</Copy>}
            {identify.isError && <Copy>{t("identificationFindError")}</Copy>}
          </View>
          {identify.isError ? (
            <>
              <Copy muted>{t("retryCost")}</Copy>
              <Action
                secondary
                title={t("newAttempt")}
                onPress={() => {
                  identifyAttempt.current = null;
                  identify.reset();
                }}
              />
            </>
          ) : (
            <Action
              title={t("findMatches")}
              busy={identify.isPending}
              disabled={photoIds.length === 0}
              onPress={() => identify.mutate([...photoIds])}
            />
          )}
          <Action
            secondary
            title={t("cancel")}
            disabled={busy}
            onPress={() => setChoosingPhotos(false)}
          />
        </>
      )}
      {picker && evidence && (
        <>
          <Text
            accessibilityRole="header"
            style={[panel.heading, { color: colors.text }]}
          >
            {t("chooseIdentification")}
          </Text>
          <Copy muted>{t("chooseIdentificationHelp")}</Copy>
          {hasChoice && (
            <Copy muted>
              {t("currentIdentification")}: {data.plant.scientificName}
            </Copy>
          )}
          {photosFor(evidence)}
          {evidence.needsMoreEvidence && <Copy muted>{t("anotherPhoto")}</Copy>}
          {ranked.length === 0 && <Copy>{t("noMatch")}</Copy>}
          {ranked
            .slice(0, compare ? undefined : 1)
            .map(({ candidate, index }, rank) => (
              <CandidateCard
                key={`${evidence.id}_${index}`}
                candidate={candidate}
                top={rank === 0}
                current={
                  hasChoice &&
                  data.plant.identificationId === evidence.id &&
                  data.plant.verification === "user_confirmed" &&
                  candidate === chosenCandidate
                }
                busy={selection.isPending}
                selecting={
                  selection.isPending &&
                  selection.variables?.candidateIndex === index
                }
                onSelect={() =>
                  selection.mutate({
                    identificationId: evidence.id,
                    candidateIndex: index,
                  })
                }
              />
            ))}
          {ranked.length > 1 && (
            <Action
              secondary
              title={`${t(compare ? "hideOtherMatches" : "compareMatches")} (${ranked.length - 1})`}
              disabled={busy}
              onPress={() => setCompare((value) => !value)}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: confidenceHelp }}
            onPress={() => setConfidenceHelp((value) => !value)}
            style={panel.textButton}
          >
            <Text style={[panel.small, { color: colors.secondary }]}>
              {t("aboutConfidence")} {confidenceHelp ? "−" : "+"}
            </Text>
          </Pressable>
          {confidenceHelp && <Copy muted>{t("confidenceHelp")}</Copy>}
          <Action
            secondary
            title={t("enterIdentificationName")}
            disabled={busy}
            onPress={() => {
              setManual(
                data.plant.verification === "user_corrected"
                  ? (data.plant.scientificName ?? "")
                  : "",
              );
              setManualOpen((value) => !value);
            }}
          />
          {manualOpen && (
            <>
              <Field
                value={manual}
                editable={!busy}
                maxLength={200}
                autoCapitalize="none"
                placeholder={t("manual")}
                onChangeText={setManual}
              />
              <Action
                title={t("useIdentificationName")}
                busy={
                  selection.isPending &&
                  selection.variables?.candidateIndex === null
                }
                disabled={busy || !manual.trim()}
                onPress={() =>
                  selection.mutate({
                    identificationId: evidence.id,
                    candidateIndex: null,
                    scientificName: manual.trim(),
                  })
                }
              />
            </>
          )}
          {selection.isError && (
            <View accessibilityLiveRegion="polite">
              <Copy>{t("identificationSaveError")}</Copy>
              <Action
                secondary
                title={t("refreshIdentification")}
                onPress={() => {
                  selection.reset();
                  void query.invalidateQueries({ queryKey });
                }}
              />
            </View>
          )}
          <Action
            secondary
            title={t(hasChoice ? "cancel" : "decideLater")}
            disabled={busy}
            onPress={() => {
              setEditing(false);
              setDeferred(true);
              selection.reset();
            }}
          />
        </>
      )}
    </GlassSurface>
  );
}
const panel = StyleSheet.create({
  surface: { gap: 12, borderRadius: 28, padding: 18 },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  name: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  scientific: { fontSize: 16, lineHeight: 23, fontStyle: "italic" },
  small: { fontSize: 13, lineHeight: 20 },
  saved: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  photoLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  photoLink: {
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoTile: {
    width: "30%",
    minWidth: 80,
    flexGrow: 1,
    maxWidth: 160,
    padding: 6,
    borderWidth: 2,
    borderRadius: 18,
    gap: 5,
    minHeight: 110,
  },
  thumbnail: { height: 80, borderRadius: 12, overflow: "hidden" },
  thumbnailImage: { width: "100%", height: 80, borderRadius: 12 },
  textButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
