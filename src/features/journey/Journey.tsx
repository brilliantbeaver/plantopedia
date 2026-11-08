import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { findSpecies } from "@plantopedia/contracts";
import { Action, Card, Copy, Screen } from "../../components/ui";
import { AppIcon, type IconName } from "../../components/AppIcon";
import { PageHeader } from "../../components/PageHeader";
import { usePreferences } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { gardenData } from "../../services/garden-data";
import { SignInPrompt } from "../auth/SignInPrompt";
import { journeyState } from "./model";
import { useJourneyCopy } from "./copy";
import { PollinationLesson } from "./PollinationLesson";

const icons: IconName[] = ["search-outline", "book-outline", "leaf-outline"];

/** Decorative vector composition built from native shapes and vector glyphs.
 * No image downloads, continuous motion, or color-only status information.
 */
function HabitatArt() {
  const { colors, mode } = usePreferences();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.art, { backgroundColor: colors.muted }]}
    >
      <View
        style={[
          styles.sun,
          { backgroundColor: mode === "dark" ? "#5D4A26" : "#F5D78E" },
        ]}
      />
      <View
        style={[
          styles.hill,
          { backgroundColor: mode === "dark" ? "#36543C" : "#C2DBB6" },
        ]}
      />
      <View style={styles.flowers}>
        {[
          { size: 42, height: 42 },
          { size: 64, height: 62 },
          { size: 48, height: 34 },
        ].map((flower, index) => (
          <View
            key={index}
            style={{ alignItems: "center", justifyContent: "flex-end" }}
          >
            <AppIcon
              name="flower"
              size={flower.size}
              color={index === 1 ? colors.warning : colors.primary}
            />
            <View
              style={{
                height: flower.height,
                width: 4,
                backgroundColor: colors.primary,
                borderRadius: 4,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 12,
                left: flower.size / 2,
              }}
            >
              <AppIcon name="leaf" size={26} color={colors.primary} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.flight}>
        <AppIcon name="sparkles-outline" size={22} color={colors.warning} />
        <View style={[styles.flightLine, { borderColor: colors.secondary }]} />
        <AppIcon name="flower-outline" size={24} color={colors.primary} />
      </View>
    </View>
  );
}

function useJourney() {
  const { kind, owner, api } = useSessionApi();
  const guest = kind === "guest";
  const metadata = useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
    enabled: !guest,
  });
  const plants = useQuery({
    queryKey: [owner, "plants"],
    queryFn: api.plants,
    enabled: !guest,
  });
  const state = journeyState(
    metadata.data ? (metadata.data.progress ?? null) : undefined,
    plants.data?.items.length,
  );
  return {
    guest,
    state,
    hasCheckInPlant: Boolean(
      plants.data?.items.some(
        (plant) =>
          findSpecies(plant.speciesId) || findSpecies(plant.scientificName),
      ),
    ),
    error: metadata.isError || plants.isError,
    loading: metadata.isPending || plants.isPending,
    refresh: () => {
      void metadata.refetch();
      void plants.refetch();
    },
  };
}

function NextAction({
  next,
  guest = false,
  hasCheckInPlant = false,
}: {
  next: number;
  guest?: boolean;
  hasCheckInPlant?: boolean;
}) {
  const copy = useJourneyCopy();
  const router = useRouter();
  return (
    <Action
      icon={
        guest
          ? "compass-outline"
          : next === 2
            ? "book-outline"
            : "arrow-forward"
      }
      title={
        guest
          ? copy.open
          : next === 0
            ? copy.start
            : next === 1
              ? copy.save
              : next === 2
                ? hasCheckInPlant
                  ? copy.care
                  : copy.chooseCheckInPlant
                : copy.again
      }
      onPress={() => {
        if (guest) router.push("/journey");
        else if (next === 2 && hasCheckInPlant) router.push("/plants");
        else if (next === -1) router.push("/search");
        else router.push({ pathname: "/search", params: { q: "sunflower" } });
      }}
    />
  );
}

export function JourneyHero() {
  const { colors } = usePreferences();
  const copy = useJourneyCopy();
  const router = useRouter();
  const { guest, state, hasCheckInPlant, error, loading, refresh } =
    useJourney();
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <HabitatArt />
      <View style={styles.heroBody}>
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>
          {copy.eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          style={[styles.headline, { color: colors.text }]}
        >
          {copy.headline}
        </Text>
        <Copy muted>{copy.intro}</Copy>
        {!guest && state && (
          <View style={styles.statusRow}>
            <AppIcon
              name={
                state.next === -1 ? "checkmark-circle" : "trail-sign-outline"
              }
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Copy>
                {state.next === -1
                  ? copy.complete
                  : `${copy.next}: ${copy.steps[state.next]}`}
              </Copy>
              <Copy muted>
                {state.completed}/3 {copy.checkpoints}
              </Copy>
            </View>
          </View>
        )}
        {!guest && !state && (
          <Copy muted>{error ? copy.unavailable : copy.loading}</Copy>
        )}
        {guest || state ? (
          <NextAction
            guest={guest}
            next={state?.next ?? 0}
            hasCheckInPlant={hasCheckInPlant}
          />
        ) : (
          <Action
            title={copy.open}
            icon="trail-sign-outline"
            onPress={() => router.push("/journey")}
          />
        )}
        {!guest && state && (
          <Action
            secondary
            compact
            icon="map-outline"
            title={copy.open}
            onPress={() => router.push("/journey")}
          />
        )}
        {!guest && error && state && <Copy muted>{copy.unavailable}</Copy>}
        {!guest && error && (
          <Action
            secondary
            compact
            title={copy.retry}
            busy={loading}
            onPress={refresh}
          />
        )}
      </View>
    </Card>
  );
}

export function JourneyScreen() {
  const copy = useJourneyCopy();
  const { colors, t } = usePreferences();
  const router = useRouter();
  const { guest, state, hasCheckInPlant, error, loading, refresh } =
    useJourney();
  return (
    <Screen vivid>
      <PageHeader title={copy.title} back />
      <Card>
        <Copy large>{guest ? copy.preview : copy.map}</Copy>
        <Copy muted>{guest ? copy.previewHelp : copy.mapHelp}</Copy>
        {!guest && !state ? (
          <>
            <Copy>{error ? copy.unavailable : copy.loading}</Copy>
            {error && <Action secondary title={copy.retry} onPress={refresh} />}
          </>
        ) : (
          <>
            {!guest && state && (
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={copy.map}
                accessibilityValue={{
                  min: 0,
                  max: 3,
                  now: state.completed,
                  text: `${state.completed}/3 ${copy.checkpoints}`,
                }}
              >
                <Copy>
                  {state.completed}/3 {copy.checkpoints}
                </Copy>
                <View
                  style={[styles.track, { backgroundColor: colors.border }]}
                >
                  <View
                    style={{
                      height: 7,
                      borderRadius: 6,
                      backgroundColor: colors.primary,
                      width: `${(state.completed / 3) * 100}%`,
                    }}
                  />
                </View>
              </View>
            )}
            {copy.steps.map((title, index) => {
              const done = !guest && state?.done[index];
              const current = !guest && state?.next === index;
              return (
                <View key={title} style={styles.step}>
                  <View
                    style={[
                      styles.node,
                      { backgroundColor: done ? colors.primary : colors.muted },
                    ]}
                  >
                    {done ? (
                      <AppIcon
                        name="checkmark"
                        color={colors.onPrimary}
                        size={22}
                      />
                    ) : (
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 18,
                          fontWeight: "700",
                        }}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.stepTitle}>
                      <AppIcon
                        name={icons[index]!}
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={[styles.stepName, { color: colors.text }]}>
                        {title}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {done ? copy.done : current ? copy.next : copy.later}
                    </Text>
                    <Copy muted>{copy.descriptions[index]}</Copy>
                    {index === 2 &&
                      !guest &&
                      state?.next === 2 &&
                      !hasCheckInPlant && (
                        <Copy muted>
                          {copy.checkInHelp.replace(
                            "{action}",
                            t("checkPlant"),
                          )}
                        </Copy>
                      )}
                    {index === 2 && !guest && state && (
                      <Copy>
                        {state.days}/3 {copy.days}
                      </Copy>
                    )}
                  </View>
                </View>
              );
            })}
            {!guest && state && (
              <NextAction next={state.next} hasCheckInPlant={hasCheckInPlant} />
            )}
          </>
        )}
        {!guest && error && state && (
          <>
            <Copy muted>{copy.unavailable}</Copy>
            <Action
              secondary
              title={copy.retry}
              busy={loading}
              onPress={refresh}
            />
          </>
        )}
      </Card>
      <PollinationLesson
        onContinue={() =>
          router.push({ pathname: "/search", params: { q: "sunflower" } })
        }
      />
      <Card>
        <AppIcon name="eye-outline" color={colors.info} size={30} />
        <Copy large>{copy.observe}</Copy>
        <Copy>{copy.observation}</Copy>
        <Copy large>{copy.local}</Copy>
        <Copy muted>{copy.localHelp}</Copy>
      </Card>
      {guest ? (
        <SignInPrompt returnTo="/journey" />
      ) : (
        <Card>
          <Copy large>{copy.rewards}</Copy>
          <Copy muted>{copy.rewardsHelp}</Copy>
          <Action
            secondary
            icon="flower-outline"
            title={copy.rewards}
            onPress={() => router.push("/progress")}
          />
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  art: { height: 138, overflow: "hidden" },
  sun: {
    width: 76,
    height: 76,
    borderRadius: 40,
    position: "absolute",
    top: 16,
    right: "17%",
  },
  hill: {
    position: "absolute",
    height: 125,
    width: "130%",
    bottom: -86,
    left: "-15%",
    borderRadius: 180,
  },
  flowers: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    flexDirection: "row",
    gap: 26,
    alignItems: "flex-end",
  },
  flight: {
    position: "absolute",
    top: 24,
    right: "12%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flightLine: {
    width: 36,
    height: 22,
    borderBottomWidth: 2,
    borderStyle: "dashed",
    borderRadius: 15,
  },
  heroBody: { padding: 20, gap: 14 },
  eyebrow: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  headline: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  statusRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  track: { height: 7, borderRadius: 6, marginTop: 10 },
  step: { flexDirection: "row", gap: 12, paddingVertical: 8 },
  node: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepName: { fontSize: 19, lineHeight: 26, fontWeight: "700", flexShrink: 1 },
});
