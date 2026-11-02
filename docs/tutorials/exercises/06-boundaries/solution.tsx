import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Pressable, Text, TextInput, ScrollView } from "react-native";
import { z } from "zod";
// This is a small input contract, not the complete server CreatePlant contract.
const NicknameInput = z.object({ nickname: z.string().trim().min(1).max(120) });
export default function Workshop() {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  function validate() {
    const raw: unknown = { nickname };
    const result = NicknameInput.safeParse(raw);
    setMessage(result.success
      ? `Valid input: ${result.data.nickname}. The server still checks authorization and its full contract.`
      : "Use a nickname containing 1 to 120 characters after removing outside spaces.");
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>Check data at a boundary</Text>
    <Text style={{ fontSize: 18, lineHeight: 26 }}>Try spaces only, a short name, and more than 120 characters. Validation explains the shape of data. It does not grant permission to an account.</Text>
    <TextInput accessibilityLabel="Specimen nickname" value={nickname} onChangeText={setNickname}
      style={{ minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, fontSize: 18 }} />
    <Pressable accessibilityRole="button" onPress={validate} style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: "#166534" }}>
      <Text style={{ color: "white", fontSize: 18 }}>Validate this input</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite" style={{ fontSize: 18, lineHeight: 26 }}>{message}</Text>
  </ScrollView></SafeAreaView>;
}
