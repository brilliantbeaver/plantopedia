import { rewardCopy } from "../rewards/reward-copy";
import { RegionChoice } from "./RegionChoice";
import { localizedSpecies } from "./localized";
import { pollinatorArt } from "./illustrations";
import * as ImagePicker from "expo-image-picker";
import { local } from "../../services/local";
import { applyRewards, startProgress } from "../rewards/rules";
import { deviceZone } from "../rewards/service";
import { ReferencePhoto, TraitChips, PollinatorStatus } from "./Comparison";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Image, Linking, Share, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type PlantSpeciesProfile } from "@plantopedia/contracts";
import { Card, Copy, Action, Disclosure, Feedback } from "../../components/ui";
import { AppIcon } from "../../components/AppIcon";
import { usePreferences, designTokens } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { gardenData } from "../../services/garden-data";
import { saveSpecies, recordGardenAction } from "../garden/actions";
import { photoCredit } from "./assets";
import { SignInPrompt } from "../auth/SignInPrompt";
import { activityCopy } from "./activity-copy";
export { ReferencePhoto, TraitChips, PollinatorStatus } from "./Comparison";

export function SpeciesContent({
  profile: rawProfile,
  plantId,
  showPhoto = false,
}: {
  profile?: PlantSpeciesProfile | undefined;
  plantId?: string | undefined;
  showPhoto?: boolean;
}) {
  const { t, colors, preferences } = usePreferences();
  const copy = activityCopy[preferences.locale];
  const profile = rawProfile ? localizedSpecies(rawProfile, t) : undefined;
  const { owner, api, kind: sessionKind } = useSessionApi();
  const guest = sessionKind === "guest";
  const router = useRouter();
  const query = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [checked, setChecked] = useState(false);
  const data = useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
    enabled: !guest,
  });
  const plants = useQuery({
    queryKey: [owner, "plants"],
    queryFn: api.plants,
    enabled: !guest,
  });
  const saved = plants.data?.items.some(
    (p) => p.speciesId === profile?.species.id || p.id === plantId,
  );
  const planted = data.data?.actions.some(
    (a) =>
      a.kind === "planting" &&
      a.speciesId === profile?.species.id &&
      a.acknowledged,
  );
  async function act(kind: "save" | "planting" | "care") {
    if (guest) {
      router.push("/login");
      return;
    }
    if (!profile || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === "save") await saveSpecies(owner, api, profile);
      else
        await recordGardenAction(
          owner,
          api,
          profile,
          kind,
          t(kind === "care" ? "checkPlant" : "plantThis"),
          plantId,
        );
      if (kind === "care") setChecked(true);
      await query.invalidateQueries({ queryKey: [owner] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function photoBonus() {
    if (busy || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const action = data.data?.actions.find(
        (a) =>
          a.kind === "planting" &&
          a.speciesId === profile.species.id &&
          a.acknowledged,
      );
      if (!action?.plantId) return;
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        exif: false,
      });
      if (selection.canceled || !selection.assets?.[0]) return;
      const photoUri = await local.retain(
        owner,
        `planting_photo_${action.plantId}`,
        selection.assets[0].uri,
      );
      await gardenData.update(owner, api, (d) => {
        const id = `photo_bonus_${profile.species.id}`;
        const actions = d.actions.some((a) => a.id === id)
          ? d.actions
          : [
              ...d.actions,
              {
                id,
                kind: "photo_bonus" as const,
                speciesId: profile.species.id,
                plantId: action.plantId,
                createdAt: new Date().toISOString(),
                acknowledged: true,
                text: "",
                photoUri,
              },
            ];
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
      await query.invalidateQueries({ queryKey: [owner, "garden-metadata"] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      {profile && (
        <>
          <Copy large>{profile.species.commonName}</Copy>
          <Copy muted>{profile.species.scientificName}</Copy>
          {showPhoto && (
            <>
              <ReferencePhoto profile={profile} />
            </>
          )}
        </>
      )}
      {guest && (
        <SignInPrompt
          compact
          saving
          returnTo={profile ? `/species/${profile.species.id}` : undefined}
        />
      )}
      <PollinatorStatus profile={profile} />
      {profile && profile.lifeCycleType !== "unknown" && (
        <Card>
          <Disclosure title={t(profile.lifeCycleType)} icon="repeat-outline">
            <Copy>{t("lifespanHelp")}</Copy>
          </Disclosure>
        </Card>
      )}
      <Card>
        <Copy large>{t("visitors")}</Copy>
        {profile?.visitors.length ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: designTokens.spacing.medium,
            }}
          >
            {profile.visitors.map((visitor) => (
              <View
                key={visitor}
                style={{
                  padding: 12,
                  borderRadius: designTokens.radius.control,
                  backgroundColor: colors.muted,
                }}
              >
                <Image
                  source={pollinatorArt[visitor]}
                  accessible={false}
                  style={{ width: 46, height: 46, alignSelf: "center" }}
                />
                <Copy>{t(visitor)}</Copy>
              </View>
            ))}
          </View>
        ) : (
          <Copy muted>
            {t(
              profile?.pollinatorValue === "none"
                ? "pollinatorNone"
                : "pollinatorUnknown",
            )}
          </Copy>
        )}
      </Card>
      {showPhoto && profile && <TraitChips profile={profile} />}
      {profile?.caution && (
        <Card>
          <AppIcon name="warning-outline" color={colors.danger} />
          <Copy>{profile.caution}</Copy>
        </Card>
      )}
      <Card>
        <Disclosure title={t("careInfo")} icon="leaf-outline">
          {!profile || !Object.keys(profile.care).length ? (
            <Copy>{t("careMissing")}</Copy>
          ) : (
            <>
              {profile.care.water && (
                <>
                  <Copy large>{t("waterLabel")}</Copy>
                  <Copy>{profile.care.water}</Copy>
                  {profile.care.waterNeed && (
                    <View
                      accessibilityLabel={`${t("waterLabel")}: ${t(profile.care.waterNeed)}`}
                    >
                      <Copy>{t(profile.care.waterNeed)}</Copy>
                      <View style={{ flexDirection: "row", gap: 5 }}>
                        {[0, 1, 2].map((n) => (
                          <View
                            key={n}
                            style={{
                              height: 8,
                              flex: 1,
                              borderRadius: 4,
                              backgroundColor:
                                n <
                                { low: 1, medium: 2, high: 3 }[
                                  profile.care.waterNeed!
                                ]
                                  ? colors.primary
                                  : colors.border,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
              {profile.care.sun && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: designTokens.spacing.small,
                      alignItems: "center",
                    }}
                  >
                    <AppIcon name="sunny-outline" color={colors.warning} />
                    <Copy large>{t("sunLabel")}</Copy>
                  </View>
                  <Copy>{profile.care.sun}</Copy>
                </>
              )}
              {profile.care.fertilizer && (
                <>
                  <Copy large>{t("fertilizerLabel")}</Copy>
                  <Copy>{profile.care.fertilizer}</Copy>
                </>
              )}
            </>
          )}
        </Disclosure>
      </Card>
      {!guest && profile && (plantId || saved) && (
        <Card>
          <Copy large>{copy.observeTitle}</Copy>
          <Copy muted>{copy.observeHelp}</Copy>
          <Action
            secondary
            title={t(checked ? "checkedPlant" : "checkPlant")}
            icon="checkmark-circle-outline"
            busy={busy}
            onPress={() => void act("care")}
          />
        </Card>
      )}
      {profile && (
        <>
          {!guest && (
            <View style={{ gap: 10 }}>
              <Action
                title={t(saved ? "alreadySaved" : "save")}
                icon="heart-outline"
                disabled={saved || busy}
                onPress={() => void act("save")}
              />
              <Card>
                <Copy large>{copy.plantingTitle}</Copy>
                <Copy muted>{copy.plantingHelp}</Copy>
                <Copy muted>
                  {rewardCopy(preferences.locale).plantingLimit}
                </Copy>
                <RegionChoice />
                <Copy muted>{copy.regionHelp}</Copy>
                {profile.species.scientificName === "Wisteria sinensis" && (
                  <Copy>{copy.noPlantingReward}</Copy>
                )}
                <Action
                  secondary
                  title={t(planted ? "planted" : "plantThis")}
                  icon="leaf"
                  disabled={planted || busy}
                  onPress={() => void act("planting")}
                />
              </Card>
              {planted &&
                !!data.data?.progress?.claims[
                  `planting:${profile.species.id}`
                ] &&
                !data.data?.actions.some(
                  (a) =>
                    a.kind === "photo_bonus" &&
                    a.speciesId === profile.species.id,
                ) && (
                  <Action
                    secondary
                    icon="images-outline"
                    title={t("photoBonus")}
                    disabled={busy}
                    onPress={() => void photoBonus()}
                  />
                )}
              <Action
                secondary
                title={t("sharePlant")}
                icon="share-outline"
                onPress={() =>
                  void Share.share({
                    message: `${profile.species.commonName} (${profile.species.scientificName})\n${profile.sourceUrl}`,
                  }).catch(setError)
                }
              />
            </View>
          )}
          <Disclosure title={t("source")} icon="information-circle-outline">
            <Action
              secondary
              title="NC State Extension"
              onPress={() =>
                void Linking.openURL(profile.sourceUrl).catch(setError)
              }
            />
            {photoCredit(profile.species.id) && (
              <Copy muted>
                {photoCredit(profile.species.id)!.creator} ·{" "}
                {photoCredit(profile.species.id)!.license} · {t("photoEdited")}
              </Copy>
            )}
            {photoCredit(profile.species.id) && (
              <Action
                secondary
                title={photoCredit(profile.species.id)!.license}
                icon="open-outline"
                onPress={() =>
                  void Linking.openURL(
                    photoCredit(profile.species.id)!.licenseUrl,
                  ).catch(setError)
                }
              />
            )}
          </Disclosure>
        </>
      )}
      {data.data?.actions.some((a) => !a.acknowledged) && (
        <Copy muted>{t("pendingActions")}</Copy>
      )}
      <Feedback error={error} />
    </View>
  );
}
