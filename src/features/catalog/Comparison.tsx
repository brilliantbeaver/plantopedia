import { localizedSpecies } from "./localized";
import { useState } from "react";
import { Image, View } from "react-native";
import type { PlantSpeciesProfile } from "@plantopedia/contracts";
import { Copy } from "../../components/ui";
import { AppIcon, type IconName } from "../../components/AppIcon";
import { usePreferences, designTokens } from "../../theme/preferences";
import { referencePhotos } from "./assets";
const traitIcons: Record<string, IconName> = {
  leaf: "leaf-outline",
  flower: "flower-outline",
  height: "resize-outline",
  bloom: "calendar-outline",
  habit: "git-branch-outline",
};
export function ReferencePhoto({ profile }: { profile: PlantSpeciesProfile }) {
  const { t } = usePreferences();
  const [failed, setFailed] = useState(false);
  if (failed || !referencePhotos[profile.species.id]) return null;
  return (
    <Image
      source={referencePhotos[profile.species.id]!}
      style={{
        width: "100%",
        height: 180,
        borderRadius: designTokens.radius.photo,
      }}
      resizeMode="cover"
      accessibilityLabel={`${t("referenceImage")}: ${profile.species.commonName}`}
      onError={() => setFailed(true)}
    />
  );
}
export function TraitChips({
  profile: rawProfile,
}: {
  profile: PlantSpeciesProfile;
}) {
  const { colors, t } = usePreferences();
  const profile = localizedSpecies(rawProfile, t);
  return (
    <View style={{ gap: designTokens.spacing.small }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: designTokens.spacing.small,
        }}
      >
        {profile.traits.slice(0, 5).map((trait) => (
          <View
            key={trait.kind}
            style={{
              padding: 10,
              borderRadius: 14,
              backgroundColor: colors.muted,
              flexDirection: "row",
              gap: 6,
              maxWidth: "100%",
              alignItems: "center",
            }}
          >
            <AppIcon
              name={traitIcons[trait.kind] ?? "leaf-outline"}
              size={18}
            />
            <View style={{ flexShrink: 1 }}>
              <Copy>{trait.text}</Copy>
            </View>
          </View>
        ))}
      </View>
      {profile.traits.length < 3 && <Copy muted>{t("traitsMissing")}</Copy>}
    </View>
  );
}
export function PollinatorStatus({
  profile,
}: {
  profile?: PlantSpeciesProfile | undefined;
}) {
  const { t, colors } = usePreferences();
  return (
    <View
      style={{
        backgroundColor: colors.muted,
        padding: 12,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: designTokens.spacing.small,
      }}
    >
      <AppIcon
        name={
          profile?.pollinatorValue === "supported"
            ? "checkmark-circle"
            : "help-circle-outline"
        }
        color={colors.primary}
      />
      <View style={{ flex: 1 }}>
        <Copy>
          {t(
            profile?.pollinatorValue === "supported"
              ? "pollinatorFriendly"
              : profile?.pollinatorValue === "none"
                ? "pollinatorNone"
                : "pollinatorUnknown",
          )}
        </Copy>
      </View>
    </View>
  );
}
