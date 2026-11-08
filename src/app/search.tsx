import { localizedSpecies } from "../features/catalog/localized";
import { catalog } from "@plantopedia/contracts";
import { rewardDiscovery } from "../features/rewards/service";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  Copy,
  Card,
  Action,
  Field,
  Feedback,
  IconButton,
  SectionHeader,
} from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { GlassSurface } from "../theme/GlassSurface";
import { usePreferences } from "../theme/preferences";
import { useSessionApi } from "../services/session";
import { searchHistory } from "../services/search-history";
import { SignInPrompt } from "../features/auth/SignInPrompt";
import { searchCatalog } from "../features/catalog/catalog";
import { searchPlants } from "../services/plant-search";
import { SearchSourceCard } from "../features/catalog/SearchSourceCard";
import {
  ReferencePhoto,
  TraitChips,
  PollinatorStatus,
} from "../features/catalog/Comparison";
export default function SearchPlants() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof q === "string" ? q.slice(0, 120) : "";
  return <SearchResults key={initialQuery} initialQuery={initialQuery} />;
}
function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [text, setText] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const [error, setError] = useState<unknown>(null);
  const {
    t,
    preferences: { locale },
  } = usePreferences();
  const { owner, api, kind } = useSessionApi();
  const guest = kind === "guest";
  const router = useRouter();
  const query = useQueryClient();
  const recent = useQuery({
    queryKey: [owner, "search-history"],
    queryFn: () => searchHistory.read(api),
    enabled: !guest,
  });
  const [historyFailure, setHistoryFailure] = useState<string | null>(null);
  const lastSaved = useRef("");
  async function saveSearch(term: string) {
    try {
      await searchHistory.record(api, term);
      lastSaved.current = term;
      setHistoryFailure(null);
      await query.invalidateQueries({ queryKey: [owner, "search-history"] });
    } catch {
      setHistoryFailure(term);
    }
  }
  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(text.trim().slice(0, 120)),
      300,
    );
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    if (guest || !debounced || lastSaved.current === debounced) return;
    let active = true;
    void searchHistory
      .record(api, debounced)
      .then(() => {
        if (!active) return;
        lastSaved.current = debounced;
        setHistoryFailure(null);
        void query.invalidateQueries({ queryKey: [owner, "search-history"] });
      })
      .catch(() => {
        if (active) setHistoryFailure(debounced);
      });
    return () => {
      active = false;
    };
  }, [api, debounced, guest, owner, query]);
  const matching = searchCatalog(debounced);
  const localMatches = debounced
    ? catalog.filter((p) =>
        localizedSpecies(p, t)
          .species.commonName.toLocaleLowerCase()
          .includes(debounced.toLocaleLowerCase()),
      )
    : [];
  const results = [
    ...new Map(
      [...matching, ...localMatches].map((p) => [
        p.species.id,
        localizedSpecies(p, t),
      ]),
    ).values(),
  ];
  const live = useQuery({
    queryKey: ["public-plant-search", locale, debounced],
    queryFn: ({ signal }) => searchPlants(debounced, locale, signal),
    enabled: debounced.length >= 1,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const current = text.trim() === debounced;
  const noMatch =
    current && live.isSuccess && !results.length && !live.data.results.length;
  async function open(id: string) {
    if (!guest) {
      try {
        await rewardDiscovery(owner, api, id, `catalog_${id}`);
        await query.invalidateQueries({ queryKey: [owner, "garden-metadata"] });
      } catch (e) {
        setError(e);
      }
    }
    router.push({
      pathname: "/species/[speciesId]",
      params: { speciesId: id },
    });
  }
  return (
    <Screen vivid>
      <PageHeader title={t("searchPlants")} back />
      <GlassSurface>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              value={text}
              onChangeText={setText}
              placeholder={t("searchPlants")}
              accessibilityLabel={t("searchPlants")}
              maxLength={120}
              autoFocus={!guest && !initialQuery}
              returnKeyType="search"
              onSubmitEditing={() => setDebounced(text.trim())}
            />
          </View>
          {!!text && (
            <IconButton
              icon="close"
              label={t("clearSearch")}
              onPress={() => {
                setText("");
                setDebounced("");
              }}
            />
          )}
        </View>
      </GlassSurface>
      <Copy muted>{t("searchLiveScope")}</Copy>
      {guest && (
        <SignInPrompt
          compact
          returnTo={
            text.trim()
              ? `/search?q=${encodeURIComponent(text.trim())}`
              : "/search"
          }
        />
      )}
      {!guest && !text.trim() && (
        <Card>
          <SectionHeader title={t("recentSearches")} />
          <Feedback loading={recent.isPending} error={recent.error} />
          {recent.isError && (
            <Action
              secondary
              title={t("tryAgain")}
              onPress={() => void recent.refetch()}
            />
          )}
          {recent.data?.items.map((entry) => (
            <Action
              key={`${entry.scope}/${entry.query}`}
              secondary
              icon="time-outline"
              title={entry.query}
              onPress={() =>
                entry.scope === "garden"
                  ? router.push({
                      pathname: "/plants",
                      params: { q: entry.query },
                    })
                  : setText(entry.query)
              }
            />
          ))}
          {recent.isSuccess && !recent.data.items.length && (
            <Copy muted>{t("searchHistoryEmpty")}</Copy>
          )}
          {!!recent.data?.items.length && (
            <Action
              secondary
              title={t("clearSearch")}
              onPress={() =>
                void searchHistory
                  .clear(api)
                  .then(() => {
                    lastSaved.current = "";
                    return query.invalidateQueries({
                      queryKey: [owner, "search-history"],
                    });
                  })
                  .catch(setError)
              }
            />
          )}
        </Card>
      )}
      {!guest && historyFailure && (
        <Card>
          <Copy>{t("searchHistorySaveError")}</Copy>
          <Action
            secondary
            title={t("retrySaveSearch")}
            onPress={() => void saveSearch(historyFailure)}
          />
        </Card>
      )}
      {(!current || (debounced.length >= 1 && live.isPending)) && (
        <View accessibilityLiveRegion="polite">
          <Copy muted>{t("searchLiveLoading")}</Copy>
          <Feedback loading />
        </View>
      )}
      {current && debounced.length >= 1 && live.isError && (
        <Card>
          <Copy>
            {t(results.length ? "searchOfflineResults" : "searchLiveError")}
          </Copy>
          <Action
            secondary
            title={t("tryAgain")}
            onPress={() => void live.refetch()}
          />
        </Card>
      )}
      {current &&
        results.map((profile) => (
          <Pressable
            key={profile.species.id}
            accessibilityRole="button"
            accessibilityLabel={`${profile.species.commonName}, ${profile.species.scientificName}`}
            onPress={() => void open(profile.species.id)}
          >
            <Card>
              <Copy large>{profile.species.commonName}</Copy>
              <Copy muted>{profile.species.scientificName}</Copy>
              <ReferencePhoto profile={profile} />
              <TraitChips profile={profile} />
              <PollinatorStatus profile={profile} />
            </Card>
          </Pressable>
        ))}
      {current &&
        !!debounced &&
        live.data?.results.map((hit) => (
          <SearchSourceCard key={hit.id} hit={hit} onError={setError} />
        ))}
      {noMatch && (
        <View accessibilityLiveRegion="polite">
          <Copy>{t("searchNoResults")}</Copy>
        </View>
      )}
      <Feedback error={error} />
    </Screen>
  );
}
