import { RequireSignIn } from "../auth/RequireSignIn";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  Pressable,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Action, Card, Copy, Feedback, Screen } from "../../components/ui";
import { AppIcon } from "../../components/AppIcon";
import { PageHeader } from "../../components/PageHeader";
import { GlassSurface } from "../../theme/GlassSurface";
import { usePreferences, designTokens } from "../../theme/preferences";
import { useReducedMotion } from "../../theme/use-reduced-motion";
import { useSessionApi } from "../../services/session";
import { gardenData } from "../../services/garden-data";
import { recoverGardenActions } from "../garden/actions";
import { avatarItems } from "./rules";
import { buyAvatar, settleRewards } from "./service";
import { rewardCopy } from "./reward-copy";
const avatarPhotos: Record<string, number> = {
  sprout: require("../../../assets/images/pollinators/avatar-sprout.png"),
  sunshine: require("../../../assets/images/pollinators/avatar-sunshine.png"),
  meadow: require("../../../assets/images/pollinators/avatar-meadow.png"),
  pollen: require("../../../assets/images/pollinators/avatar-pollen.png"),
};
function AvatarPreview({
  id,
  tier,
}: {
  id: string;
  tier: "basic" | "rare" | "mythical";
}) {
  const { t, colors, preferences } = usePreferences();
  const name = rewardCopy(preferences.locale)[
    id as "sprout" | "sunshine" | "meadow" | "pollen"
  ];
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [focused, setFocused] = useState(false);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("previewAvatar")}: ${name}`}
      onPress={() => {
        if (tier !== "mythical" || reduced) return;
        scale.stopAnimation();
        scale.setValue(0.9);
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.12,
            duration: designTokens.motion.ui,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: designTokens.motion.ui,
            useNativeDriver: true,
          }),
        ]).start();
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        alignItems: "center",
        gap: designTokens.spacing.small,
        padding: 12,
        minHeight: 44,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: focused ? colors.primary : "transparent",
        backgroundColor: pressed ? colors.muted : colors.surface,
      })}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image
          source={avatarPhotos[id]}
          accessible={false}
          style={{ width: 76, height: 76 }}
        />
      </Animated.View>
      <Copy muted>{t("previewAvatar")}</Copy>
    </Pressable>
  );
}
export function useProgress() {
  const { owner, api } = useSessionApi();
  return useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
  });
}
export function ProgressBootstrap() {
  const { owner, api } = useSessionApi();
  const query = useQueryClient();
  useEffect(() => {
    let active = true;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule(boundary?: number) {
      if (!active) return;
      clearTimeout(timer);
      // Bound long delays (including device clock changes) and retry failures
      // at most once a minute, never in a zero-delay loop.
      const delay =
        boundary === undefined
          ? 60_000
          : Math.max(1000, Math.min(86_400_000, boundary - Date.now()));
      timer = setTimeout(() => void resume(), delay);
    }
    async function resume() {
      if (
        !active ||
        running ||
        (AppState.currentState && AppState.currentState !== "active")
      )
        return;
      clearTimeout(timer);
      running = true;
      try {
        await settleRewards(owner, api);
        if (!active) return;
        await recoverGardenActions(owner, api, () => active);
        if (!active) return;
        const result = await settleRewards(owner, api);
        if (active) {
          await query.invalidateQueries({
            queryKey: [owner, "garden-metadata"],
          });
          schedule(result.progress?.day.boundary);
        }
      } catch {
        // Durable receipts survive a failure. Retry without hiding the query's error.
        schedule();
      } finally {
        running = false;
      }
    }
    void resume();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void resume();
      else clearTimeout(timer);
    });
    return () => {
      active = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [owner, api, query]);
  return null;
}
function ProgressUnavailable() {
  const { t, preferences } = usePreferences();
  const { owner, api } = useSessionApi();
  const data = useProgress();
  const query = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    setError(null);
    try {
      await settleRewards(owner, api);
      await query.invalidateQueries({ queryKey: [owner, "garden-metadata"] });
    } catch (e) {
      setError(e);
    } finally {
      setRetrying(false);
    }
  }
  return (
    <Card>
      <Feedback loading={data.isPending} error={error ?? data.error} />
      {!data.isPending && (
        <>
          <Copy muted>{rewardCopy(preferences.locale).unavailable}</Copy>
          <Action
            secondary
            title={t("retry")}
            icon="refresh"
            busy={retrying}
            onPress={() => void retry()}
          />
        </>
      )}
    </Card>
  );
}
const feedbackSeen = new Map<string, number>();
export function ProgressSummary() {
  const { t, colors } = usePreferences();
  const { owner } = useSessionApi();
  const data = useProgress();
  const router = useRouter();
  const p = data.data?.progress;
  const reduce = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0));
  const lifetime = useRef<{ owner: string; value: number } | null>(null);
  const [feedback, setFeedback] = useState<{
    owner: string;
    amount: number;
  } | null>(null);
  const earned = feedback?.owner === owner ? feedback.amount : 0;
  const lifetimeValue = p?.lifetime;
  useEffect(() => {
    const previous = lifetime.current;
    lifetime.current =
      lifetimeValue === undefined ? null : { owner, value: lifetimeValue };
    opacity.stopAnimation();
    opacity.setValue(0);
    let amount = 0;
    if (lifetimeValue !== undefined) {
      if (
        previous?.owner === owner &&
        lifetimeValue > previous.value &&
        lifetimeValue > (feedbackSeen.get(owner) ?? 0)
      ) {
        amount = lifetimeValue - previous.value;
      }
      feedbackSeen.set(
        owner,
        Math.max(feedbackSeen.get(owner) ?? 0, lifetimeValue),
      );
    }
    // Query changes are external reward events. Defer their transient UI so
    // account changes can cancel a queued announcement before it is delivered.
    const show = setTimeout(() => {
      setFeedback(amount > 0 ? { owner, amount } : null);
      if (amount > 0)
        AccessibilityInfo.announceForAccessibility(`+${amount} ${t("pollen")}`);
    }, 0);
    opacity.setValue(amount > 0 ? 1 : 0);
    const animation =
      amount > 0 && !reduce
        ? Animated.timing(opacity, {
            toValue: 0,
            delay: 1500,
            duration: designTokens.motion.reward,
            useNativeDriver: true,
          })
        : null;
    animation?.start();
    const dismiss = setTimeout(() => setFeedback(null), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(dismiss);
      animation?.stop();
    };
  }, [lifetimeValue, opacity, reduce, t, owner]);
  if (!p) return <ProgressUnavailable />;
  return (
    <GlassSurface style={{ gap: designTokens.spacing.small }}>
      <Feedback error={data.error} />
      <Action
        secondary
        compact
        icon="flower-outline"
        title={`${p?.balance ?? 0} ${t("pollen")} · ${t("level")} ${p?.level ?? 1}`}
        onPress={() => router.push("/progress")}
      />
      {earned > 0 && (
        <Animated.View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            opacity: reduce ? 1 : opacity,
            alignSelf: "center",
            transform: reduce
              ? []
              : [
                  {
                    translateY: opacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-18, 0],
                    }),
                  },
                ],
          }}
        >
          <View
            style={{ flexDirection: "row", gap: designTokens.spacing.small }}
          >
            <AppIcon name="flower-outline" color={colors.pollen} />
            <AppIcon name="sparkles-outline" color={colors.pollen} />
            <Copy>
              +{earned} {t("pollen")}
            </Copy>
          </View>
        </Animated.View>
      )}
    </GlassSurface>
  );
}
export function DailyQuest({ compact = false }: { compact?: boolean }) {
  const { t, preferences } = usePreferences();
  const data = useProgress();
  const p = data.data?.progress;
  const router = useRouter();
  const copy = rewardCopy(preferences.locale);
  if (!p) return <ProgressUnavailable />;
  const done = p.questDays.includes(p.day.key);
  return (
    <Card>
      <Copy large>{t(done ? "questDone" : "dailyQuest")}</Copy>
      <Copy muted>{done ? copy.questComplete : copy.questHelp}</Copy>
      <Action
        secondary
        compact={compact}
        icon={done ? "map-outline" : "search"}
        title={done ? copy.journey : t("searchPlants")}
        onPress={() =>
          done
            ? router.push("/journey")
            : router.push({ pathname: "/search", params: { q: "sunflower" } })
        }
      />
    </Card>
  );
}
export function ProgressScreen() {
  return (
    <RequireSignIn returnTo="/progress">
      <SignedInProgressScreen />
    </RequireSignIn>
  );
}
function SignedInProgressScreen() {
  const { t, colors, preferences } = usePreferences();
  const copy = rewardCopy(preferences.locale);
  const router = useRouter();
  const { owner, api } = useSessionApi();
  const data = useProgress();
  const p = data.data?.progress;
  const query = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function buy(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await buyAvatar(owner, api, id);
      await query.invalidateQueries({ queryKey: [owner, "garden-metadata"] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!p)
    return (
      <Screen>
        <PageHeader title={t("questsAvatar")} back />
        <ProgressUnavailable />
      </Screen>
    );
  return (
    <Screen>
      <PageHeader title={t("questsAvatar")} back />
      <ProgressSummary />
      <Copy muted>{t("profileProgress")}</Copy>
      <Copy>{copy.pollenHelp}</Copy>
      <Action
        secondary
        icon="map-outline"
        title={copy.journey}
        onPress={() => router.push("/journey")}
      />
      <DailyQuest />
      <Card>
        <Copy large>
          {t("level")} {p?.level ?? 1} · {p?.xp ?? 0}/100 XP
        </Copy>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={copy.progressLabel}
          accessibilityValue={{ min: 0, max: 100, now: p?.xp ?? 0 }}
          style={{
            height: 12,
            backgroundColor: colors.border,
            borderRadius: 8,
          }}
        >
          <View
            style={{
              width: `${p?.xp ?? 0}%`,
              height: 12,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
          />
        </View>
        <Copy muted>{copy.xpHelp}</Copy>
        {p.levelDays.includes(p.day.key) && <Copy>{t("dailyCap")}</Copy>}
      </Card>
      <Card>
        <Copy>
          {p?.milestones.includes("first_planting") ? "✓ " : "○ "}
          {t("firstPlanting")}
        </Copy>
        <Copy>
          {p?.milestones.includes("three_care_days") ? "✓ " : "○ "}
          {t("careDays")}
        </Copy>
        <Copy muted>{Math.min(p.careDays.length, 3)}/3</Copy>
        <Copy muted>{copy.plantingLimit}</Copy>
      </Card>
      <Copy large>{copy.avatars}</Copy>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: designTokens.spacing.medium,
        }}
      >
        {avatarItems.map((item) => {
          const owned = p?.unlocked.includes(item.id) ?? item.cost === 0,
            selected = p?.equipped === item.id;
          return (
            <Card
              key={item.id}
              style={{
                flexGrow: 1,
                flexBasis: 140,
                gap: designTokens.spacing.medium,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  padding: 22,
                  borderRadius: 26,
                  backgroundColor: colors.muted,
                }}
              >
                <AvatarPreview id={item.id} tier={item.tier} />
                <AppIcon
                  name={
                    item.tier === "basic"
                      ? "leaf-outline"
                      : item.tier === "rare"
                        ? "color-palette-outline"
                        : "sparkles-outline"
                  }
                  color={colors[item.tier]}
                />
              </View>
              <Copy large>{copy[item.id]}</Copy>
              <Copy muted>{t(item.tier)}</Copy>
              <Copy>
                {item.cost} {t("pollen")}
              </Copy>
              {!owned && (
                <Copy muted>
                  {p.balance < item.cost
                    ? copy.shortfall.replace(
                        "{count}",
                        String(item.cost - p.balance),
                      )
                    : t("locked")}
                </Copy>
              )}
              <Action
                secondary
                icon={owned ? "checkmark" : "lock-closed-outline"}
                title={t(selected ? "equipped" : owned ? "equip" : "buy")}
                accessibilityLabel={`${t(selected ? "equipped" : owned ? "equip" : "buy")}: ${copy[item.id]}`}
                disabled={
                  busy || selected || (!owned && (p?.balance ?? 0) < item.cost)
                }
                onPress={() => void buy(item.id)}
              />
            </Card>
          );
        })}
      </View>
      <Feedback loading={data.isPending} error={error ?? data.error} />
    </Screen>
  );
}
