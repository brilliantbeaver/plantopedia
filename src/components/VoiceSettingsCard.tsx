import { View } from "react-native";
import {
  defaultVoiceSettings,
  type VoiceSettings,
} from "@plantopedia/contracts";
import {
  Card,
  Chip,
  Copy,
  Disclosure,
  SectionHeader,
  Action,
  styles,
} from "./ui";
import { IconBadge } from "./AppIcon";
import { usePreferences } from "../theme/preferences";
import type { CopyKey } from "../i18n/locales/en";

export function VoiceSettingsCard({
  value,
  onChange,
}: {
  value: VoiceSettings;
  onChange(value: VoiceSettings): void;
}) {
  const { t } = usePreferences();
  const options = <K extends keyof VoiceSettings>(
    key: K,
    title: CopyKey,
    choices: readonly (readonly [VoiceSettings[K], CopyKey])[],
  ) => (
    <View style={{ gap: 8 }}>
      <Copy>{t(title)}</Copy>
      <View style={styles.row}>
        {choices.map(([id, label]) => (
          <Chip
            key={id}
            title={t(label)}
            selected={value[key] === id}
            onPress={() => onChange({ ...value, [key]: id })}
          />
        ))}
      </View>
    </View>
  );
  return (
    <Card>
      <View style={styles.inline}>
        <IconBadge name="mic-outline" tone="water" />
        <SectionHeader title={t("voiceSettings")} />
      </View>
      <Copy muted>{t("voiceSettingsHelp")}</Copy>
      {(
        [
          ["voiceFemale", ["marin", "coral", "shimmer"]],
          ["voiceMale", ["cedar", "ash", "ballad"]],
        ] as const
      ).map(([title, voices]) => (
        <View key={title} style={{ gap: 8 }}>
          <Copy muted>{t(title)}</Copy>
          <View style={styles.row}>
            {voices.map((voice) => (
              <Chip
                key={voice}
                icon="person-outline"
                title={voice.charAt(0).toUpperCase() + voice.slice(1)}
                selected={value.voice === voice}
                onPress={() => onChange({ ...value, voice })}
              />
            ))}
          </View>
        </View>
      ))}
      <Disclosure
        title={t("voiceListeningSetup")}
        summary={t(
          value.microphone === "headset"
            ? "voiceHeadset"
            : value.microphone === "busy"
              ? "voiceBusy"
              : "voiceSpeaker",
        )}
        icon="ear-outline"
      >
        <View style={styles.row}>
          {(
            [
              ["headset", "voiceHeadset"],
              ["speaker", "voiceSpeaker"],
              ["busy", "voiceBusy"],
            ] as const
          ).map(([microphone, label]) => (
            <Chip
              key={microphone}
              title={t(label)}
              selected={value.microphone === microphone}
              onPress={() =>
                onChange({
                  ...value,
                  microphone,
                  interruption: microphone === "busy" ? "firm" : "balanced",
                  turnTaking: microphone === "busy" ? "patient" : "balanced",
                })
              }
            />
          ))}
        </View>
        <Copy muted>{t("voiceListeningSetupHelp")}</Copy>
        {options("turnTaking", "voiceTurnTaking", [
          ["patient", "voicePatient"],
          ["balanced", "voiceBalanced"],
          ["quick", "voiceQuick"],
        ])}
        <Copy muted>{t("voicePatientHelp")}</Copy>
        {options("interruption", "voiceInterruption", [
          ["easy", "voiceEasy"],
          ["balanced", "voiceBalanced"],
          ["firm", "voiceFirm"],
          ["off", "voiceButtonOnly"],
        ])}
        <Copy muted>{t("voiceInterruptionHelp")}</Copy>
      </Disclosure>
      <Disclosure
        title={t("voiceSound")}
        summary={t(value.delivery === "calm" ? "voiceCalm" : "voiceExpressive")}
        icon="musical-notes-outline"
      >
        {options("pace", "voicePace", [
          ["relaxed", "voiceRelaxed"],
          ["normal", "voiceNormal"],
          ["brisk", "voiceBrisk"],
        ])}
        {options("delivery", "voiceDelivery", [
          ["calm", "voiceCalm"],
          ["expressive", "voiceExpressive"],
        ])}
        <Copy muted>{t("voiceDeliveryHelp")}</Copy>
        {options("ambience", "voiceAmbience", [
          ["off", "voiceAmbienceOff"],
          ["rain", "voiceRain"],
          ["breeze", "voiceBreeze"],
        ])}
        <Copy muted>{t("voiceAmbienceHelp")}</Copy>
        <Action
          secondary
          icon="refresh-outline"
          title={t("voiceReset")}
          onPress={() => onChange({ ...defaultVoiceSettings })}
        />
      </Disclosure>
    </Card>
  );
}
