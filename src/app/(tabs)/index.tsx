import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image, View } from "react-native";
import {
  Screen,
  Copy,
  Card,
  Action,
  Feedback,
  SectionHeader,
} from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { IconBadge } from "../../components/AppIcon";
import { GlassSurface } from "../../theme/GlassSurface";
import { PlantCard } from "../../components/PlantCard";
import { useCollectionHistory } from "../../services/use-collection-history";
import { useSessionApi } from "../../services/session";
import { usePreferences } from "../../theme/preferences";
export default function Explore() {
  const { api, owner } = useSessionApi();
  const { t } = usePreferences();
  const router = useRouter();
  const plants = useQuery({ queryKey: [owner, "plants"], queryFn: api.plants });
  const hasPlants = Boolean(plants.data?.items.length);
  const knownCollection = useCollectionHistory(
    owner,
    hasPlants ? true : plants.isSuccess ? false : undefined,
  );
  const isEmpty = plants.isSuccess && !hasPlants;
  const showStart = knownCollection !== true;
  return (
    <Screen>
      <PageHeader title="Plantopedia" subtitle={t("tagline")} icon="leaf" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Image
          source={require("../../../assets/images/botanical.png")}
          style={{ width: "100%", height: 170 }}
          accessible={false}
        />
        <View style={{ padding: 20, gap: 12 }}>
          <Copy large>
            {t(
              isEmpty
                ? "firstDiscovery"
                : showStart
                  ? "startDiscoveryTitle"
                  : "discover",
            )}
          </Copy>
          <Copy>{t(showStart ? "discoveryIntro" : "recall")}</Copy>
          <Action
            icon="camera"
            title={t(
              isEmpty
                ? "firstPlantAction"
                : showStart
                  ? "startDiscoveryAction"
                  : "capture",
            )}
            onPress={() => router.push("/scan")}
          />
        </View>
      </Card>
      <GlassSurface
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <IconBadge name="chatbubbles" tone="water" />
        <View style={{ flex: 1, minWidth: 140, gap: 4 }}>
          <SectionHeader title={t("chatWelcome")} />
          <Copy muted>{t("chatIntro")}</Copy>
        </View>
        <Action
          secondary
          compact
          title={t("ask")}
          icon="arrow-forward"
          onPress={() => router.push("/ask")}
        />
      </GlassSurface>
      {plants.isPending && !showStart && (
        <View accessibilityLiveRegion="polite">
          <Feedback loading />
          <Copy muted>{t("loadingPlants")}</Copy>
        </View>
      )}
      {showStart && (
        <Card>
          <IconBadge name="bulb-outline" tone="sun" size={40} />
          <Copy>{t(isEmpty ? "collectionStart" : "discoveryTipTitle")}</Copy>
          <Copy muted>
            {t(isEmpty ? "collectionStartHelp" : "discoveryTipBody")}
          </Copy>
        </Card>
      )}
      {hasPlants && (
        <SectionHeader
          title={t("recent")}
          action={t("seeAll")}
          onPress={() => router.push("/plants")}
        />
      )}
      {plants.data?.items.slice(0, 3).map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
      {plants.isError && !showStart && (
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <Copy muted>
            {t(hasPlants ? "homeCollectionStale" : "homeCollectionUnavailable")}
          </Copy>
          <Action
            secondary
            icon="refresh"
            title={t("refreshCollection")}
            busy={plants.isFetching}
            onPress={() => void plants.refetch()}
          />
        </View>
      )}
    </Screen>
  );
}
