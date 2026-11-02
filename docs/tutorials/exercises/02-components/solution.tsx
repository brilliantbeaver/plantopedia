import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type PlantSummary = { id: string; nickname: string; place: string };
function PlantCard({ plant, onOpen }: { plant: PlantSummary; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${plant.nickname}, ${plant.place}`}
      onPress={onOpen} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.75 : 1 }]}>
      <View style={styles.badge} accessible={false}><Text style={{ fontSize: 30 }}>✿</Text></View>
      <View style={styles.copy}>
        <Text style={styles.name}>{plant.nickname}</Text>
        <Text style={styles.place}>{plant.place}</Text>
      </View>
      <Text accessible={false} style={styles.arrow}>›</Text>
    </Pressable>
  );
}
export default function Workshop() {
  const [opened, setOpened] = useState(false);
  const plant = { id: "rosemary-1", nickname: "Kitchen rosemary with a deliberately long nickname", place: "East window" };
  return <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 16 }}>
    <PlantCard plant={plant} onOpen={() => setOpened(true)} />
    <Text accessibilityLiveRegion="polite" style={styles.place}>{opened ? "The card action ran. Navigation comes in lesson 03." : "Press the card, or focus it with your keyboard."}</Text>
  </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 20, backgroundColor: "#ecfdf5" },
  card: { minHeight: 100, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: "#93c5b2", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { width: 54, height: 64, borderRadius: 18, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 6 }, name: { fontSize: 20, lineHeight: 28, fontWeight: "700", color: "#102a23" },
  place: { fontSize: 17, lineHeight: 25, color: "#335447" }, arrow: { fontSize: 32, color: "#166534" },
});
