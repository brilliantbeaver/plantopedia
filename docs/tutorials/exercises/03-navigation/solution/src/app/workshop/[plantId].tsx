import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useLocalSearchParams } from "expo-router";
import { Text, ScrollView } from "react-native";
import { specimens } from "../../features/tutorial-navigation-data";
export default function WorkshopDetail() {
  const { plantId } = useLocalSearchParams<{ plantId?: string | string[] }>();
  const id = typeof plantId === "string" ? plantId : null;
  const plant = specimens.find(item => item.id === id);
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>{plant?.nickname ?? "Specimen not found"}</Text>
    <Text style={{ fontSize: 18 }}>{plant ? `This individual lives at ${plant.place}. Its stable ID is ${plant.id}.` : "The link does not match a fixture specimen. Return to the list."}</Text>
    <Link href="/workshop" style={{ padding: 14, fontSize: 18 }}>Back to the specimen list</Link>
  </ScrollView></SafeAreaView>;
}
