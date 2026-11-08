import { useState } from "react";
import { Image, Linking, Pressable, View } from "react-native";
import type { PlantSearchHit } from "@plantopedia/contracts";
import { Copy } from "../../components/ui";
import { AppIcon } from "../../components/AppIcon";
import { GlassSurface } from "../../theme/GlassSurface";
import { usePreferences } from "../../theme/preferences";

export function SearchSourceCard({
  hit,
  onError,
}: {
  hit: PlantSearchHit;
  onError: (error: unknown) => void;
}) {
  const [failed, setFailed] = useState(false);
  const { colors, t } = usePreferences();
  const domain = new URL(hit.url).hostname.replace(/^www\./, "");
  const showPhoto = hit.image?.plantVerified === true && !failed;
  return (
    <GlassSurface>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${hit.title} · ${domain} · ${t("searchOpenSource")}`}
        onPress={() => void Linking.openURL(hit.url).catch(onError)}
        style={{ gap: 10 }}
      >
        {hit.image && showPhoto && (
          <Image
            source={{ uri: hit.image.url }}
            accessibilityLabel={`${t("referenceImage")}: ${hit.title}`}
            resizeMode="cover"
            style={{ width: "100%", height: 190, borderRadius: 18 }}
            onError={() => setFailed(true)}
          />
        )}
        <Copy large>{hit.title}</Copy>
        {hit.scientificName && <Copy muted>{hit.scientificName}</Copy>}
        {!!hit.description && (
          <Copy>
            {hit.description.slice(0, 260)}
            {hit.description.length > 260 ? "…" : ""}
          </Copy>
        )}
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <AppIcon name="open-outline" color={colors.primary} size={16} />
          <Copy muted>
            {domain} · {t("searchOpenSource")}
          </Copy>
        </View>
      </Pressable>
      {hit.image && showPhoto && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${t("searchImageSource")}: ${new URL(hit.image.sourceUrl).hostname}`}
          onPress={() =>
            void Linking.openURL(hit.image!.sourceUrl).catch(onError)
          }
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Copy muted>
            {hit.image.credit ||
              `${t("searchImageSource")}: ${new URL(hit.image.sourceUrl).hostname.replace(/^www\./, "")}`}
          </Copy>
        </Pressable>
      )}
    </GlassSurface>
  );
}
