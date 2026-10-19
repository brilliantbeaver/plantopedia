import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { z } from "zod";
import { Plant, Observation } from "@plantopedia/contracts";
import {
  Screen,
  Copy,
  Field,
  Action,
  Feedback,
  Chip,
  IconButton,
  EmptyState,
  styles,
} from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { AppIcon } from "../../components/AppIcon";
import { GlassSurface } from "../../theme/GlassSurface";
import { PlantCard } from "../../components/PlantCard";
import { CollectionLoadError } from "../../components/CollectionLoadError";
import { useSessionApi } from "../../services/session";
import { usePreferences } from "../../theme/preferences";
import { useCollectionHistory } from "../../services/use-collection-history";
const Results = z.object({
  items: z.array(
    z.object({
      plant: Plant,
      observations: z.array(Observation),
      photoId: z.string().nullable(),
    }),
  ),
  limited: z.boolean(),
});
export default function Plants() {
  const { api, owner } = useSessionApi();
  const { t, colors } = usePreferences();
  const router = useRouter();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "owned" | "observed">("all");
  const records = useQuery({
    queryKey: [owner, "plants", query],
    queryFn: async () =>
      query
        ? (
            await api.request("/search", Results, {
              method: "POST",
              body: { query },
            })
          ).items.map((item) => item.plant)
        : (await api.plants()).items,
  });
  useCollectionHistory(
    owner,
    !query && records.data?.length
      ? true
      : !query && records.isSuccess
        ? false
        : undefined,
  );
  const visible = records.data?.filter(
    (plant) => filter === "all" || plant.ownership === filter,
  );
  function clear() {
    setText("");
    setQuery("");
    setFilter("all");
  }
  return (
    <Screen>
      <PageHeader
        title={t("plants")}
        subtitle={t("collection")}
        actions={
          <IconButton
            icon="add"
            label={t("addPlant")}
            onPress={() => router.push("/scan")}
          />
        }
      />
      <GlassSurface style={{ gap: 12 }}>
        <View style={styles.inline}>
          <AppIcon name="search" color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Field
              placeholder={t("search")}
              value={text}
              onChangeText={setText}
              returnKeyType="search"
              onSubmitEditing={() => setQuery(text.trim())}
            />
          </View>
          {text || query ? (
            <IconButton icon="close" label={t("clearSearch")} onPress={clear} />
          ) : null}
        </View>
        <Action
          secondary
          icon="search"
          title={t("searchAction")}
          onPress={() => setQuery(text.trim())}
        />
        <View style={styles.row}>
          <Chip
            title={t("allPlants")}
            selected={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            title={t("owned")}
            icon="heart-outline"
            selected={filter === "owned"}
            onPress={() => setFilter("owned")}
          />
          <Chip
            title={t("observed")}
            icon="compass-outline"
            selected={filter === "observed"}
            onPress={() => setFilter("observed")}
          />
        </View>
      </GlassSurface>
      <Feedback loading={records.isPending} />
      {records.isError && (
        <CollectionLoadError
          refreshing={records.isFetching}
          hasSavedPlants={Boolean(records.data?.length)}
          onRetry={() => void records.refetch()}
        />
      )}
      {records.isSuccess &&
        visible?.length === 0 &&
        (query || filter !== "all" ? (
          <EmptyState
            icon="search-outline"
            title={t("searchAction")}
            description={t("noSearchResults")}
            action={t("clearSearch")}
            onPress={clear}
          />
        ) : (
          <EmptyState
            icon="leaf-outline"
            title={t("collectionStart")}
            description={t("collectionStartHelp")}
            action={t("firstPlantAction")}
            onPress={() => router.push("/scan")}
          />
        ))}
      {!!visible?.length && (
        <Copy muted>
          {visible.length} · {t("plants")}
        </Copy>
      )}
      {visible?.map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
    </Screen>
  );
}
