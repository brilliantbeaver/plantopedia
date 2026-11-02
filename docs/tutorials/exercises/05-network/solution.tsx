import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text } from "react-native";
import { useSessionApi } from "@/services/session";
export default function Workshop() {
  const { api, owner, kind } = useSessionApi();
  const plants = useQuery({ queryKey: [owner, "plants"], queryFn: api.plants });
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>My garden</Text>
    <Text>{kind === "guest" ? "Guest collection on this device" : "Authenticated account collection"}</Text>
    {plants.isPending && <Text accessibilityLiveRegion="polite">Loading your plants…</Text>}
    {plants.isError && <Text accessibilityLiveRegion="polite">{plants.data ? "Refresh failed. The previous result remains visible." : "The collection could not be loaded. Try again."}</Text>}
    {plants.isSuccess && plants.data.items.length === 0 && <Text>No saved specimens yet. An empty success is different from an error.</Text>}
    {plants.data?.items.map(plant => <Text key={plant.id} style={{ fontSize: 19 }}>{plant.nickname}</Text>)}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: plants.isFetching }} disabled={plants.isFetching}
      onPress={() => void plants.refetch()} style={{ minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: "#166534" }}>
      <Text style={{ color: "white", fontSize: 18 }}>{plants.isFetching ? "Fetching…" : "Refresh collection"}</Text>
    </Pressable>
  </ScrollView></SafeAreaView>;
}
