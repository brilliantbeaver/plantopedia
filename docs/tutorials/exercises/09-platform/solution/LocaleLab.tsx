import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { GlassPanel } from "./GlassPanel";
const copy = {
  en: { title: "A readable garden", description: "A decorative surface should preserve the words, even when the reader increases text size or reduces transparency.", button: "Read in French" },
  fr: { title: "Un jardin lisible", description: "Une surface décorative doit préserver les mots, même lorsque la personne agrandit le texte ou réduit la transparence.", button: "Lire en anglais" },
};
export default function LocaleLab() {
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const t = copy[locale];
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView contentContainerStyle={{ padding: 24, gap: 20, backgroundColor: "#d1fae5", flexGrow: 1 }}>
    <GlassPanel style={{ gap: 18 }}>
      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, color: "#102a23" }}>{t.title}</Text>
      <Text style={{ fontSize: 19, lineHeight: 29, color: "#27483c" }}>{t.description}</Text>
      <Pressable accessibilityRole="button" onPress={() => setLocale(previous => previous === "en" ? "fr" : "en")} style={{ minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: "#166534" }}>
        <Text style={{ fontSize: 18, color: "white" }}>{t.button}</Text>
      </Pressable>
    </GlassPanel>
    <Text style={{ fontSize: 17, lineHeight: 25 }}>Change the device text size and transparency preference. Long translated text should wrap. The Android fallback is intentionally opaque.</Text>
  </ScrollView></SafeAreaView>;
}
