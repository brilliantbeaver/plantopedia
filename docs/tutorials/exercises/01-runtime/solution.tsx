import { SafeAreaView } from "react-native-safe-area-context";
import { Platform, StyleSheet, Text, View, ScrollView } from "react-native";

export default function Workshop() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PLANTOPEDIA WORKSHOP</Text>
        <Text accessibilityRole="header" style={styles.title}>A garden begins with one observation.</Text>
        <Text style={styles.body}>This screen runs on {Platform.OS}. React describes the screen, and React Native supplies the platform view and text controls.</Text>
        <Text style={styles.body}>My first specimen is a rosemary beside the kitchen window.</Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ecfdf5", padding: 24 },
  card: { padding: 24, borderRadius: 24, backgroundColor: "#fff", gap: 16 },
  eyebrow: { fontSize: 13, fontWeight: "700", color: "#166534" },
  title: { fontSize: 30, lineHeight: 38, color: "#102a23", fontWeight: "700" },
  body: { fontSize: 18, lineHeight: 28, color: "#27483c" },
});
