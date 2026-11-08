import { useState } from "react";
import { AccessibilityInfo, Linking, Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Action, Card, Copy, Disclosure, Feedback } from "../../components/ui";
import { AppIcon, type IconName } from "../../components/AppIcon";
import { usePreferences } from "../../theme/preferences";
import { learningCopy } from "./learning-copy";

/** A practice activity only: answering never records progress or awards Pollen. */
export function PollinationLesson({ onContinue }: { onContinue?: () => void }) {
  const { colors, preferences } = usePreferences();
  const copy = learningCopy[preferences.locale];
  const router = useRouter();
  const [answer, setAnswer] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const correct = answer === 1;
  const options = [copy.optionWater, copy.optionSeeds, copy.optionSpecies];
  const explanations = [
    copy.waterFeedback,
    copy.seedFeedback,
    copy.speciesFeedback,
  ];
  const diagram: { icon: IconName; label: string }[] = [
    { icon: "flower-outline", label: copy.firstFlower },
    { icon: "sparkles-outline", label: copy.pollen },
    { icon: "flower-outline", label: copy.nextFlower },
  ];
  return (
    <Card style={{ gap: 16 }}>
      <Text
        style={{
          color: colors.primary,
          fontWeight: "700",
          fontSize: 12,
          lineHeight: 18,
          letterSpacing: 1,
        }}
      >
        {copy.eyebrow}
      </Text>
      <Copy large>{copy.title}</Copy>
      <View
        accessible
        accessibilityLabel={copy.diagram}
        style={{ borderRadius: 20, backgroundColor: colors.muted, padding: 16 }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
        >
          {diagram.map((item, index) => (
            <View
              key={item.label}
              style={{ flex: 1, alignItems: "center", gap: 8 }}
            >
              <AppIcon
                name={item.icon}
                size={36}
                color={index === 1 ? colors.pollen : colors.primary}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  lineHeight: 19,
                  textAlign: "center",
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Copy>{copy.question}</Copy>
      <View style={{ gap: 8 }}>
        {options.map((option, index) => (
          <Action
            key={index}
            title={option}
            secondary
            selected={answer === index}
            disabled={correct}
            icon={
              answer === index
                ? correct
                  ? "checkmark-circle-outline"
                  : "bulb-outline"
                : undefined
            }
            onPress={() => {
              setAnswer(index);
              if (Platform.OS === "ios")
                AccessibilityInfo.announceForAccessibility(
                  `${explanations[index]} ${index === 1 ? copy.connection : copy.retry}`,
                );
            }}
          />
        ))}
      </View>
      {answer !== null && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            gap: 12,
            padding: 16,
            borderRadius: 18,
            backgroundColor: colors.muted,
          }}
        >
          <Copy>{explanations[answer]}</Copy>
          <Copy muted>{correct ? copy.connection : copy.retry}</Copy>
        </View>
      )}
      {correct && (
        <Action
          title={copy.continue}
          icon="arrow-forward"
          onPress={
            onContinue ?? (() => router.push("/species/ncsu_helianthus_annuus"))
          }
        />
      )}
      <Disclosure title={copy.source} icon="information-circle-outline">
        <Action
          secondary
          title="USDA NRCS"
          icon="open-outline"
          onPress={() => {
            setError(null);
            void Linking.openURL(
              "https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators",
            ).catch(setError);
          }}
        />
        <Action
          secondary
          title="US Forest Service"
          icon="open-outline"
          onPress={() => {
            setError(null);
            void Linking.openURL(
              "https://www.fs.usda.gov/wildflowers/pollinators/documents/AttractingPollinatorsV5.pdf",
            ).catch(setError);
          }}
        />
        <Feedback error={error} />
      </Disclosure>
    </Card>
  );
}
