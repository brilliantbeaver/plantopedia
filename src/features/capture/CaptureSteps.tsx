import { Text, View } from "react-native";
import { AppIcon, type IconName } from "../../components/AppIcon";
import { GlassSurface } from "../../theme/GlassSurface";
import { usePreferences } from "../../theme/preferences";
export function CaptureSteps({ step }: { step: 0 | 1 | 2 }) {
  const { t, colors } = usePreferences();
  const steps = ["photoStep", "detailsStep", "identifyStep"] as const;
  const icons: IconName[] = [
    "camera-outline",
    "create-outline",
    "leaf-outline",
  ];
  return (
    <GlassSurface style={{ flexDirection: "row", padding: 10, gap: 6 }}>
      {steps.map((label, index) => (
        <View
          key={label}
          style={{
            flex: 1,
            alignItems: "center",
            gap: 5,
            paddingVertical: 7,
            borderRadius: 18,
            backgroundColor: step === index ? colors.muted : "transparent",
          }}
        >
          <AppIcon
            name={index < step ? "checkmark-circle" : icons[index]!}
            size={22}
            color={index <= step ? colors.primary : colors.secondary}
          />
          <Text
            accessibilityLabel={`${index + 1}. ${t(label)}`}
            style={{
              color: index <= step ? colors.primary : colors.secondary,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: step === index ? "700" : "500",
              textAlign: "center",
            }}
          >
            {t(label)}
          </Text>
        </View>
      ))}
    </GlassSurface>
  );
}
