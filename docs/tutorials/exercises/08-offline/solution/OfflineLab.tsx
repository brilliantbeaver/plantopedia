import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, ScrollView } from "react-native";
import { randomUUID } from "expo-crypto";
import { durable, loadDrafts, saveDraft } from "./draft-store";
import type { Draft } from "./draft-contract";
export default function OfflineLab() {
  const [owner, setOwner] = useState("workshop_owner_a");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    void loadDrafts(owner).then(rows => { if (active) setDrafts(rows); }).catch(() => { if (active) setMessage("Local drafts could not be read."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner]);
  async function save() {
    if (locked.current || loading || !nickname.trim()) return;
    locked.current = true; setBusy(true); setMessage("");
    try {
      const draft = { owner, id: randomUUID(), nickname: nickname.trim() };
      await saveDraft(draft);
      // The successful write is evidence that this record is saved.
      // Avoid reporting a save failure because a separate reread failed.
      setDrafts(previous => [...previous.filter(item => item.id !== draft.id), draft]); setNickname("");
      setMessage(durable ? "Saved on this device. Restart the app to check durability." : "Saved in preview memory. Reloading the browser will remove it.");
    } catch { setMessage("The local save failed. Your input remains available."); }
    finally { locked.current = false; setBusy(false); }
  }
  const button = { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: "#166534" };
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>Keep a local draft</Text>
    <Text>{durable ? "Native SQLite storage" : "Web preview: memory only"} · {owner}</Text>
    <TextInput accessibilityLabel="Draft nickname" value={nickname} onChangeText={setNickname}
      style={{ minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, fontSize: 18 }} />
    <Pressable accessibilityRole="button" disabled={loading || busy || !nickname.trim()} accessibilityState={{ disabled: loading || busy || !nickname.trim() }} onPress={() => void save()} style={button}>
      <Text style={{ color: "white", fontSize: 18 }}>{busy ? "Saving…" : "Save local draft"}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { if (locked.current) return; setLoading(true); setDrafts([]); setMessage(""); setNickname(""); setOwner(previous => previous === "workshop_owner_a" ? "workshop_owner_b" : "workshop_owner_a"); }} style={{ minHeight: 48, padding: 14 }}>
      <Text style={{ fontSize: 18 }}>Switch teaching owner</Text>
    </Pressable>
    {loading && <Text accessibilityLiveRegion="polite">Loading this owner’s local drafts…</Text>}
    {drafts.map(draft => <Text key={draft.id}>{draft.nickname} · {draft.id}</Text>)}
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Text>These two owner names are fixtures. Switching them demonstrates storage partitioning, not real authentication. This screen saves locally; the Node outbox model below teaches remote retries.</Text>
  </ScrollView></SafeAreaView>;
}
