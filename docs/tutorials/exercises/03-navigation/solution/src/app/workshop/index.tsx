import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Text, ScrollView } from "react-native";
import { specimens } from "../../features/tutorial-navigation-data";
export default function WorkshopIndex() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>Two rosemary specimens</Text>
    {specimens.map(plant => <Link key={plant.id} href={{ pathname: "/workshop/[plantId]", params: { plantId: plant.id } }}
      style={{ padding: 16, fontSize: 18, minHeight: 48 }}>
      {plant.nickname} · {plant.place}
    </Link>)}
  </ScrollView></SafeAreaView>;
}
