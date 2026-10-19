import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionApi } from "../services/session";
import { usePreferences } from "../theme/preferences";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { GlassSurface } from "../theme/GlassSurface";
import { AppIcon } from "./AppIcon";
import { Copy } from "./ui";

function DockButton({
  label,
  children,
  onPress,
  primary = false,
  disabled = false,
  expanded,
}: {
  label: string;
  children: ReactNode;
  onPress(): void;
  primary?: boolean;
  disabled?: boolean;
  expanded?: boolean;
}) {
  const { colors } = usePreferences();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled,
        ...(expanded !== undefined ? { expanded } : {}),
      }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        dock.button,
        primary && dock.primary,
        {
          backgroundColor: primary ? colors.primary : colors.muted,
          borderColor: focused
            ? primary
              ? colors.onPrimary
              : colors.primary
            : "transparent",
          opacity: disabled ? 0.65 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function VoiceOrb({ active }: { active: boolean }) {
  const { colors } = usePreferences();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    pulse.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: active ? 650 : 2200,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: active ? 650 : 2200,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduced, pulse]);
  return (
    <View
      aria-hidden
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[dock.orb, { backgroundColor: colors.muted }]}
    >
      <Animated.View
        style={[
          dock.halo,
          {
            backgroundColor: colors.primary,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, active ? 0.18 : 0.09],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1.15],
                }),
              },
            ],
          },
        ]}
      />
      <View style={dock.wave}>
        {[8, 16, 23, 16, 8].map((height, index) => (
          <Animated.View
            key={index}
            style={{
              width: 3,
              height,
              borderRadius: 2,
              backgroundColor: colors.primary,
              transform: [
                {
                  scaleY: active
                    ? pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          index % 2 ? 0.45 : 1,
                          index % 2 ? 1 : 0.5,
                        ],
                      })
                    : 1,
                },
              ],
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function VoiceDock({
  conversationId,
  startOnMount = false,
  onStarted,
}: {
  conversationId: string;
  startOnMount?: boolean;
  onStarted?(): void;
}) {
  const { voice, owner } = useSessionApi();
  const { t, preferences, colors } = usePreferences();
  const query = useQueryClient();
  const state = useSyncExternalStore(
    voice.subscribe,
    voice.getSnapshot,
    voice.getSnapshot,
  );
  const transport = voice.transport;
  useEffect(() => {
    if (!startOnMount) return;
    // A cancellable user intent: leaving the screen before mount must not open the mic.
    const timer = setTimeout(() => {
      onStarted?.();
      void transport
        .record(conversationId, preferences.locale)
        .catch(() => undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, [startOnMount, onStarted, transport, conversationId, preferences.locale]);
  const [details, setDetails] = useState(false);
  const [transcript, setTranscript] = useState(false);
  useFocusEffect(
    useCallback(
      () => () => {
        void transport.disconnect();
      },
      [transport],
    ),
  );
  useEffect(() => {
    if (state.completedId) void query.invalidateQueries({ queryKey: [owner] });
  }, [state.completedId, owner, query]);
  const open = !["idle", "error"].includes(state.phase);
  const starting = ["requesting_permission", "connecting"].includes(
    state.phase,
  );
  const active = open && !state.muted;
  const title = state.muted
    ? t("voiceMuted")
    : starting
      ? t("voiceConnecting")
      : state.playingAudio
        ? t("voiceSpeaking")
        : state.phase === "processing"
          ? t("thinking")
          : state.phase === "hearing"
            ? t("voiceHearing")
            : open
              ? t("voiceListening")
              : t("voiceTurnHelp");
  return (
    <GlassSurface style={dock.surface}>
      <View style={dock.row}>
        <VoiceOrb active={active} />
        <View style={dock.intro} accessibilityLiveRegion="polite">
          <Text style={[dock.eyebrow, { color: colors.secondary }]}>
            {t("voiceCompanion")}
          </Text>
          <Text style={[dock.title, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={dock.controls}>
          <DockButton
            primary
            label={t(
              open ? (state.muted ? "voiceUnmute" : "voiceMute") : "voice",
            )}
            disabled={starting}
            onPress={() => {
              setTranscript(false);
              void (
                open
                  ? transport.send()
                  : transport.record(conversationId, preferences.locale)
              ).catch(() => undefined);
            }}
          >
            <AppIcon
              name={open && !state.muted ? "mic-off" : "mic"}
              size={22}
              color={colors.onPrimary}
            />
            {!open && (
              <Text style={[dock.buttonText, { color: colors.onPrimary }]}>
                {t("voice")}
              </Text>
            )}
          </DockButton>
          {open && state.playingAudio && (
            <DockButton
              label={t("voiceInterrupt")}
              onPress={() => {
                void transport.play();
              }}
            >
              <AppIcon name="hand-left-outline" color={colors.text} />
            </DockButton>
          )}
          {open ? (
            <DockButton
              label={t("voiceEnd")}
              onPress={() => {
                void transport.disconnect();
              }}
            >
              <AppIcon name="close" color={colors.text} />
            </DockButton>
          ) : (
            <DockButton
              label={t("voiceInfo")}
              expanded={details}
              onPress={() => setDetails((value) => !value)}
            >
              <AppIcon
                name="information-circle-outline"
                color={colors.secondary}
              />
            </DockButton>
          )}
        </View>
      </View>
      {details && <Copy muted>{t("voiceLiveHint")}</Copy>}
      {open && state.notice && (
        <Copy muted>
          {t(
            state.notice === "voice_no_speech"
              ? "voiceNoSpeech"
              : state.notice === "voice_context_unavailable"
                ? "voiceContextMissing"
                : state.notice === "voice_history_unavailable"
                  ? "voiceHistoryMissing"
                  : state.notice === "voice_reply_incomplete"
                    ? "voiceIncomplete"
                    : "voiceTranscriptMissing",
          )}
        </Copy>
      )}
      {state.phase === "error" && (
        <View accessibilityLiveRegion="polite">
          <Copy>
            {t(
              state.error === "voice_native_rebuild"
                ? "voiceRebuild"
                : state.error === "voice_session_ended"
                  ? "voiceSessionEnded"
                  : "voiceUnavailable",
            )}
          </Copy>
        </View>
      )}
      {state.caption.length > 0 && (
        <View style={dock.transcript}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: transcript }}
            onPress={() => setTranscript((value) => !value)}
            style={dock.transcriptButton}
          >
            <Text style={[dock.transcriptLabel, { color: colors.primary }]}>
              {t("voiceTranscript")}
            </Text>
            <AppIcon
              name={transcript ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.primary}
            />
          </Pressable>
          {transcript && (
            <View style={dock.transcriptBody}>
              {state.userCaption.length > 0 && (
                <Copy muted>{state.userCaption}</Copy>
              )}
              <Copy>{state.caption}</Copy>
            </View>
          )}
        </View>
      )}
    </GlassSurface>
  );
}
const dock = StyleSheet.create({
  surface: { gap: 12, borderRadius: 28, padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  intro: { flex: 1, minWidth: 130, gap: 3 },
  eyebrow: { fontSize: 12, lineHeight: 17, fontWeight: "500" },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  button: {
    flexDirection: "row",
    gap: 8,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  primary: { paddingHorizontal: 20 },
  buttonText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  symbol: { fontSize: 20, lineHeight: 24 },
  info: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    fontFamily: "serif",
  },
  orb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  halo: { position: "absolute", width: 44, height: 44, borderRadius: 22 },
  wave: { flexDirection: "row", alignItems: "center", gap: 3 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  track: { height: 3, flex: 1, borderRadius: 2, overflow: "hidden" },
  timer: { fontSize: 12, fontVariant: ["tabular-nums"] },
  transcript: { gap: 8 },
  transcriptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
  },
  transcriptLabel: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  transcriptBody: { gap: 8 },
});
