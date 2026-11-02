import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Pressable, Text, TextInput, ScrollView } from "react-native";
const initial = [{ id: "east", nickname: "Rosemary" }, { id: "west", nickname: "Rosemary" }];
export default function Workshop() {
  const [plants, setPlants] = useState(initial);
  const [nickname, setNickname] = useState("Kitchen rosemary");
  const [message, setMessage] = useState("");
  function rename() {
    const clean = nickname.trim();
    if (!clean) { setMessage("Enter a nickname before saving."); return; }
    setPlants(previous => previous.map(plant => plant.id === "east" ? { ...plant, nickname: clean } : plant));
    setMessage("Only the east specimen changed. Its ID stayed east.");
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>Rename one individual</Text>
    {plants.map(plant => <Text key={plant.id} style={{ fontSize: 18 }}>{plant.id}: {plant.nickname}</Text>)}
    <TextInput accessibilityLabel="New nickname for the east specimen" value={nickname} onChangeText={setNickname}
      style={{ minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, fontSize: 18 }} />
    <Pressable accessibilityRole="button" onPress={rename} style={{ minHeight: 48, padding: 14, backgroundColor: "#166534", borderRadius: 12 }}>
      <Text style={{ color: "white", fontSize: 18 }}>Save nickname</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite">{message}</Text>
  </ScrollView></SafeAreaView>;
}
