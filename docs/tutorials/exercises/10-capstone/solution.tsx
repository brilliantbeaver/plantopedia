import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { z } from "zod";
type Specimen = { id: string; nickname: string; place: string };
const Name = z.string().trim().min(1).max(120);
const key = ["workshop", "fixture_owner", "plants"] as const;
const fixtures: Specimen[] = [
  { id: "rosemary-east", nickname: "Kitchen rosemary", place: "East window" },
  { id: "rosemary-west", nickname: "Patio rosemary", place: "West patio" },
];
// Explicit teaching fixture: no network, account, durable disk, camera or provider.
// This local client isolates the lab cache from Plantopedia's real account cache.
export default function Workshop() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  return <QueryClientProvider client={client}><GardenLab /></QueryClientProvider>;
}
function GardenLab() {
  const server = useRef(fixtures.map(plant => ({ ...plant })));
  const failNext = useRef(false);
  const [nickname, setNickname] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const plants = useQuery({ queryKey: key, queryFn: async () => {
    if (failNext.current) { failNext.current = false; throw new Error("Deliberate fixture refresh failure"); }
    return server.current.map(plant => ({ ...plant }));
  } });
  const add = useMutation({ mutationFn: async (plant: Specimen) => {
    // A replay with the same ID keeps one fixture record, like an idempotent create.
    if (!server.current.some(item => item.id === plant.id)) server.current = [...server.current, plant];
    return plant;
  }, onSuccess: async () => { setNickname(""); setMessage("The fixture specimen was added. Its ID will not change when renamed."); await queryClient.invalidateQueries({ queryKey: key }); } });
  function save() {
    const result = Name.safeParse(nickname);
    if (!result.success) { setMessage("Enter 1 to 120 characters after trimming spaces."); return; }
    add.mutate({ id: randomUUID(), nickname: result.data, place: "Learning garden" });
  }
  const selected = plants.data?.find(plant => plant.id === selectedId);
  const visible = [...(plants.data ?? [])].filter(plant => plant.nickname.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => a.nickname.localeCompare(b.nickname));
  const button = { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: "#166534" };
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#ecfdf5" }}>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 38, color: "#102a23" }}>My learning garden</Text>
      <Text style={{ fontSize: 17, lineHeight: 25, color: "#335447" }}>Fixture mode · Every record belongs to a teaching owner. Restarting this screen removes new records. This lab makes no cloud requests.</Text>
      {selected ? <View style={{ padding: 20, borderRadius: 24, backgroundColor: "white", gap: 14 }}>
        <Text accessibilityRole="header" style={{ fontSize: 25 }}>{selected.nickname}</Text>
        <Text style={{ fontSize: 18 }}>{selected.place}</Text><Text>Stable specimen ID: {selected.id}</Text>
        <Pressable accessibilityRole="button" style={button} onPress={() => setSelectedId(null)}><Text style={{ color: "white", fontSize: 18 }}>Back to the list</Text></Pressable>
      </View> : <>
        <TextInput accessibilityLabel="Filter specimens by nickname" placeholder="Find a nickname" value={search} onChangeText={setSearch} style={{ minHeight: 48, padding: 14, backgroundColor: "white", borderRadius: 14, borderWidth: 1, fontSize: 18 }} />
        {plants.isPending && <Text accessibilityLiveRegion="polite">Loading fixture records…</Text>}
        {plants.isError && <Text accessibilityLiveRegion="polite">Refresh failed. Previously fetched records remain visible. Press Refresh to recover.</Text>}
        {plants.isSuccess && visible.length === 0 && <Text>{plants.data.length ? "No nickname matches the filter." : "Your learning garden is empty."}</Text>}
        {visible.map(plant => <Pressable key={plant.id} accessibilityRole="button" accessibilityLabel={`Open ${plant.nickname}, ${plant.place}`} onPress={() => setSelectedId(plant.id)} style={{ minHeight: 76, padding: 18, gap: 6, backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: "#83a99a" }}>
          <Text style={{ fontSize: 21, fontWeight: "700", color: "#102a23" }}>{plant.nickname}</Text><Text style={{ fontSize: 17, color: "#335447" }}>{plant.place}</Text>
        </Pressable>)}
        <Text accessibilityRole="header" style={{ fontSize: 22 }}>Add one individual</Text>
        <TextInput accessibilityLabel="New specimen nickname" placeholder="A memorable nickname" value={nickname} onChangeText={setNickname} style={{ minHeight: 48, padding: 14, backgroundColor: "white", borderWidth: 1, borderRadius: 14, fontSize: 18 }} />
        <Pressable accessibilityRole="button" disabled={add.isPending} accessibilityState={{ disabled: add.isPending }} style={button} onPress={save}><Text style={{ color: "white", fontSize: 18 }}>{add.isPending ? "Adding…" : "Add fixture specimen"}</Text></Pressable>
        {add.isError && <Text accessibilityLiveRegion="polite">The fixture save failed. Your input remains available.</Text>}
      </>}
      <Pressable accessibilityRole="button" disabled={plants.isFetching} accessibilityState={{ disabled: plants.isFetching }} style={button} onPress={() => void plants.refetch()}><Text style={{ color: "white", fontSize: 18 }}>{plants.isFetching ? "Refreshing…" : "Refresh fixture collection"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={plants.isFetching} accessibilityState={{ disabled: plants.isFetching }} style={{ minHeight: 48, padding: 14 }} onPress={() => { failNext.current = true; void plants.refetch(); }}><Text style={{ fontSize: 18, color: "#7c2d12" }}>Make the next refresh fail</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, lineHeight: 25 }}>{message}</Text>
    </ScrollView>
  </SafeAreaView>;
}
