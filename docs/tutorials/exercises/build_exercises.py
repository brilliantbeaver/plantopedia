from pathlib import Path
import json
ROOT=Path(__file__).parent

def write(path, text):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);text=text.strip()+"\n"
    if p.suffix == '.tsx' and (p.name == 'starter.tsx' and p.parent.name in {'01-runtime','02-components','04-state','05-network','06-boundaries','07-camera'}):
        text='/* eslint-disable @typescript-eslint/no-unused-vars -- Starter bindings are intentionally reserved for the learner to implement. */\n'+text
    p.write_text(text)

write(Path('README.md'), r'''
# Plantopedia exercise workshop

These ten exercises accompany the interactive course. They use the versions already installed in the Plantopedia repository: Expo SDK 57, React Native 0.86.3, React 19.2.3 and TanStack Query 5.104.3. Use the repository's pinned Node 22.23.1 and npm 12.0.2. Run `npm ci` and `npm run build:contracts` at the repository root first. Do not install another Expo version into this workspace.

There are two different ways to practice. The `.tsx` files are real React Native teaching screens. Run them through Expo in this repository. The `.mjs` files are dependency-free JavaScript models; run those with Node. A Node test cannot prove that a camera, microphone, native glass view, or operating system permission works. The course's browser and notebook models have the same boundary.

## Start with the executable logic workbook

From `docs/tutorials/exercises`, run:

```sh
node --test logic/checks.test.mjs
```

The default selects `logic/solution.mjs`. All tests should pass. To work on the deliberately unfinished version:

```sh
LAB_MODE=starter node --test logic/checks.test.mjs
```

The starter checks deliberately fail until you replace each `TODO` in `logic/starter.mjs`. Edit that file, rerun the same command, and compare with the solution only after a serious attempt. Each test name begins with the lesson number. For example, run only state checks with:

```sh
LAB_MODE=starter node --test --test-name-pattern="04 " logic/checks.test.mjs
```

The tests check behavior, including stale state, non-success HTTP responses, malformed data, missing owners, denied permissions, duplicate retry delivery, and cleanup after a failure. They are teaching examples, not copies of Plantopedia's production tests. The dependency-free `readPlantPage` model checks only an intentionally small display shape of `items` with string IDs and nicknames. It is not the full shared PlantPage schema. The TSX API exercise uses the real service and its full runtime contract.

## Run a React Native exercise

Use a temporary learning branch or make a local backup before creating practice routes. These exercise files do not modify the application by themselves. For lessons 01, 02, 04, 05, 06 and 07, copy the chosen `starter.tsx` to `src/app/workshop.tsx`. Start Expo with `npm start` and open `/workshop` through the Expo Router development navigation or a link from a practice screen. On web, use the repository's `npm run web` command and visit `/workshop`. Read the lesson README for the specific route and expected result. When done, delete your temporary route. Before lesson 03, remove `src/app/workshop.tsx` so it does not compete with the folder route `src/app/workshop/index.tsx`. After lesson 03, remove the temporary `src/app/workshop/` folder before returning to a single-file workshop route. Compare your work with `solution.tsx` rather than overwriting app screens.

Lesson 03 supplies two routes and a tiny fixture module. Lessons 08 and 09 supply platform files and a route wrapper. Their READMEs give exact placement. Lesson 10 supplies a complete fixture-backed capstone that can be copied to `src/app/workshop.tsx`. Do not copy source files from different lessons into the same route at once. A new route becomes part of the app only after copying it into `src/app`; files under this directory are not app routes.

The API exercise uses Plantopedia's existing `SessionProvider` or `GuestSessionProvider` through `useSessionApi`. A cloud session needs the existing backend and Clerk configuration described in the root README. Guest mode has different capabilities and is labeled in the screen. No exercise asks you to provision a new service or paste a token. Public Expo environment variables are bundled into the app and cannot hold provider secrets.

Expo Go previews most exercises when its SDK matches this repository. The real native voice bridge requires the app's development build. The camera exercise needs a supported device or browser permission context; test native permission behavior on a real phone. The offline SQLite solution is durable on native, while its web adapter explicitly keeps data only in memory. The platform exercise uses an opaque fallback where glass is unsupported or reduced transparency is requested.

## Exercise map

| Lesson | Build and check | React Native files | Node check name |
| --- | --- | --- | --- |
| 01 | Choose a runtime and render a first screen. | `01-runtime/{starter,solution}.tsx` | `01 ` |
| 02 | Pass plant data and make a usable card. | `02-components/{starter,solution}.tsx` | `02 ` |
| 03 | Keep specimen identity through navigation. | `03-navigation/{starter,solution}/` | `03 ` |
| 04 | Rename without changing an old state snapshot. | `04-state/{starter,solution}.tsx` | `04 ` |
| 05 | Handle loading, errors, cached data and refresh. | `05-network/{starter,solution}.tsx` | `05 ` |
| 06 | Validate a boundary without exposing credentials. | `06-boundaries/{starter,solution}.tsx` | `06 ` |
| 07 | Separate permission, readiness and capture. | `07-camera/{starter,solution}.tsx` | `07 ` |
| 08 | Save a durable draft and understand retry identity. | `08-offline/{starter,solution}/` | `08 ` |
| 09 | Pick an accessible surface and release resources. | `09-platform/{starter,solution}/` | `09 ` |
| 10 | Combine the ideas and assess release evidence. | `10-capstone/{starter,solution}.tsx` | `10 ` |

Each lesson includes a prediction, implementation task, acceptance criteria, and a transfer question. Write your explanation before revealing a solution. A passing test is one piece of evidence; check the stated user behavior on a device too.

## Verify the provided worked files

From the repository root, run the isolated example type check:

```sh
./node_modules/.bin/tsc --noEmit -p docs/tutorials/exercises/tsconfig.json
```

This checks the worked TSX examples and their helpers against the installed packages. It excludes deliberately unfinished starters. It does not run Expo, contact the API, grant permission, or prove a release is ready.
''')
write(Path('tsconfig.json'), '''{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "types": ["react", "react-native"],
    "skipLibCheck": true
  },
  "include": ["**/solution.tsx", "**/solution/**/*.ts", "**/solution/**/*.tsx"],
  "exclude": ["**/starter/**", "**/starter.tsx", "../../../node_modules"]
}''')

intro = '''import { Pressable, StyleSheet, Text, View } from "react-native";

'''
write(Path('01-runtime/starter.tsx'), intro+'''// Copy this file to src/app/workshop.tsx. Render text inside Text.
export default function Workshop() {
  return <View style={{ padding: 24 }}><Text>TODO: introduce your plant notebook.</Text></View>;
}
''')
write(Path('01-runtime/solution.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
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
''')
write(Path('02-components/starter.tsx'), '''import { Text, View } from "react-native";
type PlantSummary = { id: string; nickname: string; place: string };
function PlantCard({ plant, onOpen }: { plant: PlantSummary; onOpen: () => void }) {
  // TODO: use a Pressable, name its purpose, and invoke onOpen on a press.
  // TODO: preserve a readable text column when the nickname becomes long.
  return <View><Text>{plant.nickname}</Text></View>;
}
export default function Workshop() {
  const plant = { id: "rosemary-1", nickname: "Kitchen rosemary", place: "East window" };
  return <PlantCard plant={plant} onOpen={() => console.info("Open plant", plant.id)} />;
}
''')
write(Path('02-components/solution.tsx'), '''import { useState } from "react";
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
''')

write(Path('03-navigation/solution/data.ts'), '''// Deliberately small teaching fixture, not records from a cloud account.
export const specimens = [
  { id: "rosemary-east", nickname: "Kitchen rosemary", place: "East window" },
  { id: "rosemary-west", nickname: "Patio rosemary", place: "West patio" },
];
''')
write(Path('03-navigation/solution/index.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Text, ScrollView } from "react-native";
import { specimens } from "./data";
export default function WorkshopIndex() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
    <Text accessibilityRole="header" style={{ fontSize: 26 }}>Two rosemary specimens</Text>
    {specimens.map(plant => <Link key={plant.id} href={{ pathname: "/workshop/[plantId]", params: { plantId: plant.id } }}
      style={{ padding: 16, fontSize: 18, minHeight: 48 }}>
      {plant.nickname} · {plant.place}
    </Link>)}
  </ScrollView></SafeAreaView>;
}
''')
write(Path('03-navigation/solution/[plantId].tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useLocalSearchParams } from "expo-router";
import { Text, ScrollView } from "react-native";
import { specimens } from "./data";
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
''')
write(Path('03-navigation/starter/data.ts'), (ROOT/'03-navigation/solution/data.ts').read_text())
write(Path('03-navigation/starter/index.tsx'), '''import { Text, View } from "react-native";
import { specimens } from "./data";
export default function WorkshopIndex() {
  // TODO: render a Link for each record using its stable id in plantId.
  return <View style={{ padding: 24 }}>{specimens.map(plant => <Text key={plant.id}>{plant.nickname}</Text>)}</View>;
}
''')
write(Path('03-navigation/starter/[plantId].tsx'), '''import { Text, View } from "react-native";
export default function WorkshopDetail() {
  // TODO: read and normalize plantId; find the fixture record; handle unknown ids.
  return <View style={{ padding: 24 }}><Text>Which specimen belongs to this route?</Text></View>;
}
''')
write(Path('04-state/starter.tsx'), '''import { useState } from "react";
import { Button, Text, View } from "react-native";
const initial = [{ id: "east", nickname: "Rosemary" }, { id: "west", nickname: "Rosemary" }];
export default function Workshop() {
  const [plants, setPlants] = useState(initial);
  function rename() {
    // TODO: update only east using a functional setter and map. Preserve old objects.
  }
  return <View style={{ padding: 24, gap: 16 }}>
    {plants.map(plant => <Text key={plant.id}>{plant.id}: {plant.nickname}</Text>)}
    <Button title="Rename east to Kitchen rosemary" onPress={rename} />
  </View>;
}
''')
write(Path('04-state/solution.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
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
''')
write(Path('05-network/starter.tsx'), '''import { Text, View } from "react-native";
import { useSessionApi } from "@/services/session";
export default function Workshop() {
  const { api, owner } = useSessionApi();
  // TODO: useQuery with [owner, "plants"] and api.plants. Show pending, error,
  // empty and data states separately. Keep existing data during refresh failures.
  return <View style={{ padding: 24 }}><Text>Load the current owner’s plants.</Text></View>;
}
''')
write(Path('05-network/solution.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
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
''')
write(Path('06-boundaries/starter.tsx'), '''import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
export default function Workshop() {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  function validate() {
    // TODO: validate a trimmed nickname of 1–120 characters with zod.
    // Do not cast unknown JSON to a trusted type or print authentication tokens.
  }
  return <View style={{ padding: 24, gap: 16 }}>
    <TextInput accessibilityLabel="Nickname" value={nickname} onChangeText={setNickname} />
    <Button title="Check input" onPress={validate} /><Text>{message}</Text>
  </View>;
}
''')
write(Path('06-boundaries/solution.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
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
''')
write(Path('07-camera/starter.tsx'), '''import { CameraView, useCameraPermissions } from "expo-camera";
import { Text, View } from "react-native";
export default function Workshop() {
  const [permission, requestPermission] = useCameraPermissions();
  // TODO: handle loading, denial, canAskAgain=false, readiness and a busy capture.
  // Keep the CameraView mounted only while this route has focus.
  return <View style={{ flex: 1, padding: 24 }}><Text>Build the permission flow before taking a photograph.</Text></View>;
}
''')
write(Path('07-camera/solution.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { Image, Linking, Platform, Pressable, Text, ScrollView } from "react-native";
export default function Workshop() {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const captureLock = useRef(false);
  const focused = useRef(false);
  const focusVersion = useRef(0);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    focusVersion.current += 1; focused.current = true; setActive(true); setReady(false); setBusy(captureLock.current);
    return () => { focusVersion.current += 1; focused.current = false; setActive(false); setReady(false); };
  }, []));
  async function capture() {
    if (!focused.current || !permission?.granted || !ready || captureLock.current || !camera.current) return;
    const version = focusVersion.current;
    captureLock.current = true; setBusy(true); setError("");
    try {
      const result = await camera.current.takePictureAsync({ quality: 0.8, exif: false });
      if (focused.current && focusVersion.current === version && result) setPhoto(result.uri);
    } catch {
      if (focused.current && focusVersion.current === version) setError("The photograph failed. Try again while the camera is ready.");
    } finally {
      captureLock.current = false;
      if (focused.current) setBusy(false);
    }
  }
  async function ask() {
    try { await requestPermission(); }
    catch { setError("Camera permission could not be requested."); }
  }
  const button = { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: "#166534" };
  if (!permission) return <SafeAreaView style={{ flex: 1, padding: 24, backgroundColor: "#f5fff9" }}><Text>Checking camera permission…</Text></SafeAreaView>;
  if (!permission.granted) return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text style={{ fontSize: 20 }}>Allow the camera when you want to photograph a plant.</Text>
    {permission.canAskAgain
      ? <Pressable accessibilityRole="button" onPress={() => void ask()} style={button}><Text style={{ color: "white" }}>Allow camera</Text></Pressable>
      : Platform.OS === "web"
        ? <Text>Camera access was denied. Open this site’s camera permission in browser site settings, then reload the page.</Text>
        : <><Text>Camera access was denied. Use your device settings to change the permission.</Text><Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings().catch(() => setError("Open your device settings manually to change camera access.")); }} style={button}><Text style={{ color: "white" }}>Open app settings</Text></Pressable></>}
    {Platform.OS === "web" && <Text>Use a secure browser page. If asking again has no effect, change this site’s camera permission in browser settings and reload.</Text>}
    <Text accessibilityLiveRegion="polite">{error}</Text>
  </ScrollView></SafeAreaView>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5fff9" }}><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12 }}>
    <Text accessibilityRole="header" style={{ fontSize: 24 }}>Capture a teaching preview</Text>
    {active && <CameraView ref={camera} facing="back" style={{ flex: 1, minHeight: 240 }}
      onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setError("The camera could not start on this device."); }} />}
    <Pressable accessibilityRole="button" disabled={!ready || busy} accessibilityState={{ disabled: !ready || busy }}
      onPress={() => void capture()} style={[button, { opacity: !ready || busy ? 0.5 : 1 }]}>
      <Text style={{ color: "white", fontSize: 18 }}>{busy ? "Taking photograph…" : "Take photograph"}</Text>
    </Pressable>
    {photo && <Image source={{ uri: photo }} accessibilityLabel="The most recent plant photograph" style={{ height: 140, width: "100%" }} />}
    <Text accessibilityLiveRegion="polite">{error}</Text>
    <Text>This URI is a temporary preview. Production CaptureScreen retains the original and prepares a metadata-free derivative before upload.</Text>
  </ScrollView></SafeAreaView>;
}
''')
write(Path('08-offline/solution/draft-contract.ts'), '''import { z } from "zod";
export const DraftSchema = z.object({ owner: z.string().min(1), id: z.string().min(1), nickname: z.string().trim().min(1).max(120) });
export type Draft = z.infer<typeof DraftSchema>;
''')
write(Path('08-offline/solution/draft-store.ts'), '''import { openDatabaseAsync } from "expo-sqlite";
import { DraftSchema, type Draft } from "./draft-contract";
const database = openDatabaseAsync("plantopedia-workshop.db").then(async db => {
  await db.execAsync("CREATE TABLE IF NOT EXISTS workshop_drafts (owner TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,id))");
  return db;
});
export const durable = true;
export async function loadDrafts(owner: string): Promise<Draft[]> {
  const db = await database;
  const rows = await db.getAllAsync<{ value: string }>("SELECT value FROM workshop_drafts WHERE owner = ?", owner);
  return rows.map(row => DraftSchema.parse(JSON.parse(row.value)));
}
export async function saveDraft(raw: Draft) {
  const draft = DraftSchema.parse(raw);
  const db = await database;
  await db.runAsync("INSERT OR REPLACE INTO workshop_drafts(owner,id,value) VALUES (?,?,?)", draft.owner, draft.id, JSON.stringify(draft));
}
''')
write(Path('08-offline/solution/draft-store.web.ts'), '''import { DraftSchema, type Draft } from "./draft-contract";
// Explicit preview adapter: these values disappear when the browser reloads.
const records = new Map<string, Draft>();
export const durable = false;
export async function loadDrafts(owner: string): Promise<Draft[]> {
  return [...records.values()].filter(draft => draft.owner === owner);
}
export async function saveDraft(raw: Draft) {
  const draft = DraftSchema.parse(raw);
  records.set(`${draft.owner}/${draft.id}`, draft);
}
''')
write(Path('08-offline/solution/OfflineLab.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
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
''')
write(Path('08-offline/solution/workshop-route.txt'), '''// Save this as src/app/workshop.tsx after copying the other solution files
// into src/features/tutorial-offline/.
export { default } from "../features/tutorial-offline/OfflineLab";
''')
write(Path('08-offline/starter/draft-store.ts'), '''export type Draft = { owner: string; id: string; nickname: string };
// TODO: open a separate workshop SQLite database and create an owner/id primary key.
// Bind SQL parameters. Resolve save only after the database write succeeds.
export const durable = false;
export async function loadDrafts(_owner: string): Promise<Draft[]> { return []; }
export async function saveDraft(_draft: Draft): Promise<void> { throw new Error("TODO: save a draft"); }
''')
write(Path('08-offline/starter/OfflineLab.tsx'), '''import { Text, View } from "react-native";
export default function OfflineLab() {
  // TODO: add a nickname form, save handler, loading/error message and owner-filtered list.
  // Clear the old owner's rows immediately when changing owners.
  return <View style={{ padding: 24 }}><Text>Make a local save survive a native app restart.</Text></View>;
}
''')
write(Path('09-platform/solution/GlassPanel.tsx'), '''import { View, type ViewProps } from "react-native";
// Android and other platforms receive an opaque, readable surface.
export function GlassPanel({ style, ...props }: ViewProps) {
  return <View {...props} style={[{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#83a99a", backgroundColor: "#f5fff9" }, style]} />;
}
''')
write(Path('09-platform/solution/GlassPanel.ios.tsx'), '''import { useEffect, useState } from "react";
import { AccessibilityInfo, View, type ViewProps } from "react-native";
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from "expo-glass-effect";
export function GlassPanel({ style, ...props }: ViewProps) {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setReduce(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduce);
    return () => { active = false; subscription.remove(); };
  }, []);
  const shared = [{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#83a99a" }, style];
  if (reduce || !isLiquidGlassAvailable() || !isGlassEffectAPIAvailable()) return <View {...props} style={[shared, { backgroundColor: "#f5fff9" }]} />;
  return <GlassView {...props} colorScheme="light" style={shared} />;
}
''')
write(Path('09-platform/solution/GlassPanel.web.tsx'), '''import { useEffect, useState } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
export function GlassPanel({ style, ...props }: ViewProps) {
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const contrast = window.matchMedia("(prefers-contrast: more)");
    const update = () => setOpaque(reduce.matches || contrast.matches || !CSS.supports("backdrop-filter", "blur(1px)"));
    update(); reduce.addEventListener("change", update); contrast.addEventListener("change", update);
    return () => { reduce.removeEventListener("change", update); contrast.removeEventListener("change", update); };
  }, []);
  const glass: ViewStyle & { backdropFilter?: string } = opaque ? {} : { backgroundColor: "rgba(245,255,249,0.90)", backdropFilter: "blur(20px) saturate(140%)" };
  return <View {...props} style={[{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#83a99a", backgroundColor: "#f5fff9" }, glass, style]} />;
}
''')
write(Path('09-platform/solution/LocaleLab.tsx'), '''import { SafeAreaView } from "react-native-safe-area-context";
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
''')
write(Path('09-platform/solution/workshop-route.txt'), '''// Save as src/app/workshop.tsx after copying solution files to src/features/tutorial-platform/.
export { default } from "../features/tutorial-platform/LocaleLab";
''')
write(Path('09-platform/starter/GlassPanel.tsx'), '''import { View, type ViewProps } from "react-native";
export function GlassPanel({ style, ...props }: ViewProps) {
  // TODO: retain this readable fallback and add .ios.tsx and .web.tsx adapters.
  // Start with opaque content until capability and preference checks complete.
  return <View {...props} style={[{ padding: 20, backgroundColor: "#f5fff9" }, style]} />;
}
''')
write(Path('09-platform/starter/LocaleLab.tsx'), '''import { Text } from "react-native";
import { GlassPanel } from "./GlassPanel";
export default function LocaleLab() {
  // TODO: add a language state, complete messages, and a clearly labeled switch.
  return <GlassPanel><Text>A readable garden</Text></GlassPanel>;
}
''')
write(Path('10-capstone/starter.tsx'), '''import { Text, View } from "react-native";
export default function Workshop() {
  // TODO: combine a fixture API, owner-scoped query, validated input, immutable
  // updates, stable IDs, list/detail views, retry feedback and accessible actions.
  // Keep fixture behavior visibly labeled. Test errors, empty success and long text.
  return <View style={{ padding: 24 }}><Text>Build your garden learning lab.</Text></View>;
}
''')
write(Path('10-capstone/solution.tsx'), '''import { useRef, useState } from "react";
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
''')
write(Path('logic/solution.mjs'), r'''
/** Pure JavaScript teaching models. These functions do not run React or native APIs.
 * readPlantPage checks only the declared items/id/nickname display shape, not the full server schema. */
export function runtimeSupportsVoice(runtime) {
  return runtime === "development-build";
}
export function cardLayout(width, fontScale) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(fontScale) || fontScale <= 0) throw new Error("invalid_size");
  return width < 360 || fontScale > 1.3 ? "column" : "row";
}
export function plantHref(id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("invalid_id");
  return `/plants/${encodeURIComponent(id)}`;
}
export function renamePlant(plants, id, nickname) {
  const clean = nickname.trim();
  if (!clean) throw new Error("invalid_nickname");
  return plants.map(plant => plant.id === id ? { ...plant, nickname: clean } : plant);
}
export async function readPlantPage(response) {
  if (!response.ok) throw new Error(`http_${response.status}`);
  const body = await response.json();
  if (!body || !Array.isArray(body.items) || body.items.some(plant => !plant || typeof plant.id !== "string" || typeof plant.nickname !== "string")) throw new Error("invalid_response");
  return { items: body.items.map(plant => ({ id: plant.id, nickname: plant.nickname })) };
}
export function queryKey(owner) {
  if (typeof owner !== "string" || !owner.trim()) throw new Error("missing_owner");
  return [owner, "plants"];
}
export function authorizeRecord(authenticatedOwner, recordOwner) {
  if (!authenticatedOwner || authenticatedOwner !== recordOwner) throw new Error("forbidden");
  return true;
}
export function canCapture({ permissionGranted, cameraReady, busy, focused }) {
  return permissionGranted === true && cameraReady === true && busy === false && focused === true;
}
const running = new Set();
/** Resumable foreground model. Stable keys require a server that honors idempotency. */
export async function syncDraft(api, store, initial, sameOwner) {
  const scope = `${initial.owner}/${initial.id}`;
  if (running.has(scope)) throw new Error("operation_in_progress");
  running.add(scope);
  let draft = { ...initial };
  const assertOwner = () => { if (!sameOwner()) throw new Error("account_changed"); };
  async function advance(stage) {
    assertOwner();
    draft = { ...draft, stage };
    await store.save(draft);
  }
  try {
    assertOwner();
    if (draft.stage === "draft") {
      await api.createPlant(draft, `plant_${draft.id}`);
      await advance("plant");
    }
    assertOwner();
    if (draft.stage === "plant") {
      await api.observe(draft, `observation_${draft.id}`);
      await advance("observation");
    }
    assertOwner();
    if (draft.stage === "observation") {
      await api.upload(draft, `photo_${draft.id}`);
      await advance("photo");
    }
    assertOwner();
    if (draft.stage === "photo") await advance("complete");
    if (draft.stage !== "complete") throw new Error("invalid_stage");
    return draft;
  } finally { running.delete(scope); }
}
export function surfacePolicy({ supportsGlass, reduceTransparency, highContrast }) {
  return supportsGlass === true && reduceTransparency === false && highContrast === false ? "glass" : "opaque";
}
export function createVoiceCleanup({ closeSocket, stopMicrophone }) {
  let cleanup;
  return () => {
    cleanup ??= Promise.allSettled([
      Promise.resolve().then(closeSocket),
      Promise.resolve().then(stopMicrophone),
    ]);
    return cleanup;
  };
}
export function releaseBlockers(report) {
  return ["typecheck", "logicTests", "deviceCamera", "deniedPermission", "offlineRestart", "accountSwitch", "voiceCleanup", "largeText"].filter(key => report[key] !== true);
}
''')
write(Path('logic/starter.mjs'), r'''
/** Replace the TODOs. Run with LAB_MODE=starter; compare behavior rather than text. */
export function runtimeSupportsVoice(_runtime) { return false; } // TODO 01
export function cardLayout(_width, _fontScale) { return "row"; } // TODO 02
export function plantHref(_id) { return "/plants/rosemary"; } // TODO 03
export function renamePlant(plants, _id, _nickname) { return plants; } // TODO 04
export async function readPlantPage(response) { return response.json(); } // TODO 05
export function queryKey(_owner) { return ["plants"]; } // TODO 06
export function authorizeRecord(_authenticatedOwner, _recordOwner) { return true; } // TODO 06
export function canCapture({ permissionGranted }) { return permissionGranted; } // TODO 07
export async function syncDraft(_api, _store, initial, _sameOwner) { return initial; } // TODO 08
export function surfacePolicy(_preferences) { return "glass"; } // TODO 09
export function createVoiceCleanup(_resources) { return async () => {}; } // TODO 09
export function releaseBlockers(_report) { return []; } // TODO 10
''')
write(Path('logic/checks.test.mjs'), r'''
import test from "node:test";
import assert from "node:assert/strict";
const mode = process.env.LAB_MODE ?? "solution";
if (!["starter", "solution"].includes(mode)) throw new Error("LAB_MODE must be starter or solution");
const lab = await import(`./${mode}.mjs`);

test("01 runtime: the local voice bridge needs a development build", () => {
  assert.equal(lab.runtimeSupportsVoice("development-build"), true);
  assert.equal(lab.runtimeSupportsVoice("expo-go"), false);
  assert.equal(lab.runtimeSupportsVoice("browser-preview"), false);
});
test("02 layout: narrow screens and large text need breathing room", () => {
  assert.equal(lab.cardLayout(390, 1), "row");
  assert.equal(lab.cardLayout(320, 1), "column");
  assert.equal(lab.cardLayout(430, 1.6), "column");
  assert.throws(() => lab.cardLayout(0, 1), /invalid_size/);
});
test("03 navigation: same species still has distinct specimen routes", () => {
  assert.equal(lab.plantHref("rosemary-east"), "/plants/rosemary-east");
  assert.equal(lab.plantHref("rosemary-west"), "/plants/rosemary-west");
  assert.throws(() => lab.plantHref("../other"), /invalid_id/);
  assert.throws(() => lab.plantHref(""), /invalid_id/);
});
test("04 state: renaming keeps the old snapshot and the stable ID", () => {
  const previous = Object.freeze([Object.freeze({ id: "east", nickname: "Rosemary" }), Object.freeze({ id: "west", nickname: "Rosemary" })]);
  const next = lab.renamePlant(previous, "east", "  Kitchen rosemary  ");
  assert.notEqual(next, previous);
  assert.equal(next[0].nickname, "Kitchen rosemary");
  assert.equal(next[0].id, "east");
  assert.equal(previous[0].nickname, "Rosemary");
  assert.equal(next[1], previous[1]);
  assert.throws(() => lab.renamePlant(previous, "east", "   "), /invalid_nickname/);
});
test("05 HTTP: a resolved fetch can still be an unsuccessful request", async () => {
  let read = false;
  await assert.rejects(lab.readPlantPage({ ok: false, status: 503, json: async () => { read = true; return { items: [] }; } }), /http_503/);
  assert.equal(read, false);
});
test("05 contract: empty success is valid; malformed data must fail", async () => {
  assert.deepEqual(await lab.readPlantPage({ ok: true, status: 200, json: async () => ({ items: [] }) }), { items: [] });
  await assert.rejects(lab.readPlantPage({ ok: true, status: 200, json: async () => ({ items: [{ id: 4, nickname: "Rosemary" }] }) }), /invalid_response/);
  await assert.rejects(lab.readPlantPage({ ok: true, status: 200, json: async () => null }), /invalid_response/);
});
test("06 identity: owner-scoped cache entries stay separate", () => {
  assert.deepEqual(lab.queryKey("alice"), ["alice", "plants"]);
  assert.deepEqual(lab.queryKey("bob"), ["bob", "plants"]);
  assert.notDeepEqual(lab.queryKey("alice"), lab.queryKey("bob"));
  assert.throws(() => lab.queryKey(""), /missing_owner/);
});
test("06 authorization: a cache key does not grant record access", () => {
  assert.equal(lab.authorizeRecord("alice", "alice"), true);
  assert.throws(() => lab.authorizeRecord("bob", "alice"), /forbidden/);
  assert.throws(() => lab.authorizeRecord(null, "alice"), /forbidden/);
});
test("07 camera: permission is only one of four capture conditions", () => {
  const ready = { permissionGranted: true, cameraReady: true, busy: false, focused: true };
  assert.equal(lab.canCapture(ready), true);
  for (const patch of [{ permissionGranted: false }, { cameraReady: false }, { busy: true }, { focused: false }]) assert.equal(lab.canCapture({ ...ready, ...patch }), false);
});
function fixtureServer() {
  const writes = new Map();
  const attempts = [];
  let loseFirstAcknowledgement = true;
  async function send(kind, draft, key) {
    attempts.push(key);
    if (!writes.has(key)) writes.set(key, { kind, id: draft.id });
    if (kind === "plant" && loseFirstAcknowledgement) {
      loseFirstAcknowledgement = false;
      throw new Error("acknowledgement_lost");
    }
  }
  return { writes, attempts, api: { createPlant: (draft, key) => send("plant", draft, key), observe: (draft, key) => send("observation", draft, key), upload: (draft, key) => send("photo", draft, key) } };
}
test("08 outbox: lost acknowledgement retries one operation with one stable key", async () => {
  const server = fixtureServer();
  const initial = { owner: "alice", id: "fern_1", stage: "draft" };
  let persisted = { ...initial };
  const store = { save: async draft => { persisted = { ...draft }; } };
  await assert.rejects(lab.syncDraft(server.api, store, initial, () => true), /acknowledgement_lost/);
  assert.equal(persisted.stage, "draft");
  const result = await lab.syncDraft(server.api, store, persisted, () => true);
  assert.equal(result.stage, "complete");
  assert.equal(persisted.stage, "complete");
  assert.equal(server.writes.size, 3);
  assert.deepEqual(server.attempts, ["plant_fern_1", "plant_fern_1", "observation_fern_1", "photo_fern_1"]);
});
test("08 account boundary: account changes stop later writes and acknowledgements", async () => {
  let sameOwner = true;
  const calls = [];
  const api = { createPlant: async () => { calls.push("plant"); sameOwner = false; }, observe: async () => { calls.push("observation"); }, upload: async () => { calls.push("photo"); } };
  const store = { save: async () => { calls.push("persist"); } };
  await assert.rejects(lab.syncDraft(api, store, { owner: "alice", id: "fern_2", stage: "draft" }, () => sameOwner), /account_changed/);
  assert.deepEqual(calls, ["plant"]);
});
test("08 resume: a recorded observation skips earlier acknowledged steps", async () => {
  const calls = [];
  const api = { createPlant: async () => { calls.push("plant"); }, observe: async () => { calls.push("observation"); }, upload: async (_draft, key) => { calls.push(key); } };
  const store = { save: async draft => { calls.push(draft.stage); } };
  const result = await lab.syncDraft(api, store, { owner: "alice", id: "fern_3", stage: "observation" }, () => true);
  assert.equal(result.stage, "complete");
  assert.deepEqual(calls, ["photo_fern_3", "photo", "complete"]);
});
test("08 concurrency: two foreground syncs for the same draft cannot overlap", async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const api = { createPlant: async () => { await wait; }, observe: async () => {}, upload: async () => {} };
  const store = { save: async () => {} };
  const initial = { owner: "alice", id: "fern_concurrent", stage: "draft" };
  const first = lab.syncDraft(api, store, initial, () => true);
  await assert.rejects(lab.syncDraft(api, store, initial, () => true), /operation_in_progress/);
  release();
  assert.equal((await first).stage, "complete");
});
test("09 surface: accessibility preferences outrank a decorative capability", () => {
  assert.equal(lab.surfacePolicy({ supportsGlass: true, reduceTransparency: false, highContrast: false }), "glass");
  for (const policy of [{ supportsGlass: false, reduceTransparency: false, highContrast: false }, { supportsGlass: true, reduceTransparency: true, highContrast: false }, { supportsGlass: true, reduceTransparency: false, highContrast: true }, {}]) assert.equal(lab.surfacePolicy(policy), "opaque");
});
test("09 voice: a socket cleanup failure does not leave the microphone active", async () => {
  const calls = [];
  let microphoneActive = true;
  const cleanup = lab.createVoiceCleanup({ closeSocket: () => { calls.push("socket"); throw new Error("closed"); }, stopMicrophone: async () => { calls.push("microphone"); microphoneActive = false; } });
  await cleanup(); await cleanup();
  assert.deepEqual(calls, ["socket", "microphone"]);
  assert.equal(microphoneActive, false);
});
test("10 evidence: missing acceptance evidence blocks a release claim", () => {
  const report = { typecheck: true, logicTests: true, deviceCamera: true, deniedPermission: true, offlineRestart: true, accountSwitch: true, voiceCleanup: true, largeText: true };
  assert.deepEqual(lab.releaseBlockers(report), []);
  assert.deepEqual(lab.releaseBlockers({ ...report, offlineRestart: false, voiceCleanup: undefined }), ["offlineRestart", "voiceCleanup"]);
});
''')
lessons = [
('01-runtime', 'Choose the correct runtime',
 'Predict which parts of Plantopedia you can explore in Expo Go and which require the app’s development build. Then render a first screen that introduces one real specimen.',
 ['Copy starter.tsx to src/app/workshop.tsx.', 'Render a title, a short explanation and a specimen description using View and Text.', 'Show Platform.OS, then compare the same screen on web and a supported phone.'],
 ['All visible words are inside Text.', 'The screen respects safe areas and remains readable with large text.', 'You can explain why the custom native voice bridge does not appear just because its JavaScript was refreshed.'],
 'Why would adding a native module require rebuilding a development client, while changing a paragraph normally does not?'),
('02-components', 'Build one reusable plant card',
 'A reusable card should receive data from its parent and report a press through a function. It should remain readable when a name grows long.',
 ['Copy starter.tsx to src/app/workshop.tsx.', 'Replace the outer card with Pressable and call onOpen only when a press occurs.', 'Use a row with a fixed decorative badge and a flexible text column. Add a descriptive accessibility label.'],
 ['The press action runs once for one press.', 'The nickname wraps without covering the arrow.', 'The whole card has a generous press target and a meaningful screen reader name.'],
 'Why is onPress={onOpen} different from onPress={onOpen()}?'),
('03-navigation', 'Link to an individual specimen',
 'Two rosemary plants share a species but need different histories. Use the stable specimen ID in a route rather than a nickname or a species name.',
 ['Copy the files inside starter/src/app/workshop/ to src/app/workshop/.', 'Copy starter/src/features/tutorial-navigation-data.ts to src/features/tutorial-navigation-data.ts. Keep fixtures outside the route directory so they do not become unintended routes.', 'Use Link with pathname /workshop/[plantId] and params.plantId. Read and normalize the route parameter in the detail screen.', 'The worked solution has the same directory structure: copy its src contents into the repository src tree. Restart Expo so new typed routes are discovered.'],
 ['The two links open different IDs and locations.', 'An unknown ID displays a useful not-found message.', 'Changing a nickname in the fixture does not require changing the route ID.'],
 'Which identifier should an observation keep if the reader renames the plant tomorrow?'),
('04-state', 'Preserve the previous state snapshot',
 'Rename one individual without changing the old array or another individual. Think about the next render rather than editing a displayed object in place.',
 ['Copy starter.tsx to src/app/workshop.tsx.', 'Add a controlled TextInput for the new nickname.', 'Use setPlants(previous => previous.map(...)) and return a new object for the matching ID.', 'Reject spaces-only nicknames without losing the typed input.'],
 ['Only the east specimen changes.', 'The ID stays the same after a rename.', 'The logic tests can freeze the old array and its objects without causing a mutation error.'],
 'Why is the nickname used for display, while the ID is used for matching and list keys?'),
('05-network', 'Show the full life of a collection request',
 'Use the existing session API and TanStack Query rather than building another account system. An empty successful collection, a pending request, and a failed request need different explanations.',
 ['Copy starter.tsx to src/app/workshop.tsx.', 'Use useQuery with queryKey [owner, "plants"] and queryFn api.plants.', 'Render pending, error, empty-success and populated states. Keep old data visible when a refresh fails.', 'Add a refresh action and explain why it is disabled while fetching.'],
 ['The key contains the current owner.', 'A guest collection is labeled as a device collection.', 'An initial failure does not look like an empty successful garden.', 'A failed refresh can show both an error and older records.'],
 'Why does a resolved fetch promise still require checking response.ok before trusting the JSON?'),
('06-boundaries', 'Validate data without confusing identity and permission',
 'A TypeScript type disappears at runtime. Validate unknown input and explain the separate server check that decides whether the signed-in person can access a record.',
 ['Copy starter.tsx to src/app/workshop.tsx.', 'Create a small zod schema for a trimmed nickname of 1–120 characters.', 'Use safeParse and render a full explanation for success or failure.', 'Run the owner and authorization logic checks. Never print a token or place a provider key in EXPO_PUBLIC variables.'],
 ['Spaces-only input fails.', 'A trimmed valid name succeeds.', 'Malformed unknown data is not accepted through a type assertion.', 'You can explain that owner-scoped query keys separate caches but do not authorize a server request.'],
 'Who must reject a request if someone changes a record ID to another person’s specimen?'),
('07-camera', 'Ask, wait, capture and recover',
 'Permission lets the app ask the hardware for a photograph. Camera readiness means the hardware view has started. Busy and focus conditions prevent duplicate capture and capture from an unfocused route. Native background and resume behavior still needs a device acceptance check.',
 ['Copy starter.tsx to src/app/workshop.tsx.', 'Implement loading, grant, denial and canAskAgain=false states.', 'Use onCameraReady, a synchronous focus check, and a ref lock so a queued background press or two rapid presses cannot start captures. Ignore results from an earlier focus session.', 'Unmount the camera when the route loses focus. Show a temporary preview and a recoverable failure message.'],
 ['No capture begins before permission and readiness.', 'A denied permission produces a clear next step.', 'Two rapid presses do not create concurrent captures; a queued press after blur cannot start one.', 'The UI describes the preview as temporary and does not claim exif:false proves metadata removal.'],
 'What extra work must production CaptureScreen do before an uploaded photograph is private, durable and ready to share with identification providers?'),
('08-offline', 'Keep local progress and reuse retry identity',
 'Separate a successful local save from a successful remote sync. Native SQLite preserves a draft after an app restart. A retry must keep the original operation ID when the server might already have accepted it.',
 ['Create src/features/tutorial-offline and copy the starter files there. Add the route wrapper shown in solution/workshop-route.txt as src/app/workshop.tsx.', 'Implement a SQLite table keyed by owner and id with bound parameters. Add a .web.ts preview adapter that clearly states its durability.', 'Save a draft, restart the native app, and check that the same ID remains. Switch the fixture owner and verify that the old list clears.', 'Complete the syncDraft logic model. Make a server commit succeed but its acknowledgement fail; retry with the same key.'],
 ['Native draft records survive a restart.', 'The web adapter is explicitly memory-only.', 'Changing owners does not show the previous owner’s rows.', 'The lost-acknowledgement test creates three remote logical writes, despite four attempts.', 'Identification is not silently bundled into saving.'],
 'Why is a new random operation ID on every retry dangerous after a lost acknowledgement?'),
('09-platform', 'Preserve usability across platforms',
 'Use platform files to keep a consistent interface while each platform chooses an available implementation. Decoration must respect the reader’s transparency and text preferences.',
 ['Create src/features/tutorial-platform and copy starter files there. Use the route wrapper from solution/workshop-route.txt.', 'Keep GlassPanel.tsx as a readable opaque fallback; add guarded .ios.tsx and .web.tsx adapters.', 'Add complete English and French messages, then switch language without cutting off longer text.', 'Complete createVoiceCleanup in the Node model so stopping one resource still happens when another cleanup fails.'],
 ['Opaque content appears before preference checks finish.', 'Unsupported glass and reduced transparency use a readable fallback.', 'Long text wraps after changing language and increasing device text size.', 'Repeated cleanup stops the microphone and closes the socket once, even if one operation rejects.'],
 'Why should a failed socket close never prevent stopping microphone capture?'),
('10-capstone', 'Build a complete learning garden',
 'Combine the patterns in a small fixture-backed garden. The worked solution is deliberately local and visibly labeled. It gives you a safe place to test UI transitions without needing a new service account.',
 ['Copy starter.tsx to src/app/workshop.tsx and build a list with a detail view for the selected ID.', 'Use a stable QueryClient, an owner-scoped key, complete input validation, and immutable fixture updates.', 'Add nickname filtering, an add action and a deliberate refresh failure control.', 'Check large text, keyboard navigation and an unknown/empty collection. Then write a capstone plan mapping fixture operations to the existing apiClient, CaptureScreen and outbox.', 'Complete releaseBlockers and distinguish automated evidence from device acceptance.'],
 ['Two specimens can share a species or nickname and still remain separate records.', 'A successful add updates the collection without changing older snapshots.', 'An intentional failed refresh keeps prior data and can recover.', 'Fixture mode and memory lifetime are obvious.', 'The release checklist identifies missing camera, offline, account-switch and voice evidence.'],
 'Which claims would still need a real device and configured backend even if every fixture check passed?')
]
for folder,title,brief,steps,criteria,question in lessons:
    no=folder[:2]
    setup=''
    if no=='03':
        setup='\nBoth starter and solution mirror the real app directory tree. Copy their src contents into the repository src tree. Their fixture module already sits outside the route directory, and their imports already target it.\n'
    if no=='08':
        setup='\nThe worked solution includes `draft-contract.ts`, `draft-store.ts`, `draft-store.web.ts` and `OfflineLab.tsx`. Copy these into `src/features/tutorial-offline/`; the route wrapper imports the screen. The SQLite database is separate from Plantopedia’s application database and contains only the workshop fixtures. This exercise does not implement a production outbox, automatic background delivery, or secure authentication. The JavaScript outbox model demonstrates foreground retries with a cooperating idempotent server.\n'
    if no=='09':
        setup='\nCopy all worked solution `.ts` and `.tsx` files into `src/features/tutorial-platform/` and create the route wrapper. Always import `./GlassPanel` without a suffix, so Metro chooses `.ios.tsx`, `.web.tsx`, or the base `.tsx`. The example supports a light palette; integrate the production preference theme before claiming dark-mode support. Native voice acceptance requires the real development build and is outside this screen.\n'
    if no=='10':
        setup='\nThe complete capstone solution uses its own QueryClient, an in-memory fixture API, validated nicknames, list/detail selection, accessible buttons and intentional failure injection. It never calls a cloud provider. Its async operations return immediately, so the pending state may be too brief to observe; the HTML network lab is the place to explore adjustable latency. To build the full application, trace the course’s source references and replace these explicit fixture operations with the existing authenticated services. A fixture pass is not production acceptance.\n'
    text=f'# {no} · {title}\n\n{brief}\n\n## Predict before you edit\n\nWrite down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.\n\n## Build\n\n'+ '\n'.join(f'{i+1}. {s}' for i,s in enumerate(steps))+'\n'+setup+'\n## Check the result\n\n'+'\n'.join(f'- {c}' for c in criteria)+f'\n\nFrom `docs/tutorials/exercises`, run the worked model with:\n\n```sh\nnode --test --test-name-pattern="{no} " logic/checks.test.mjs\n```\n\nThen edit `logic/starter.mjs` and run:\n\n```sh\nLAB_MODE=starter node --test --test-name-pattern="{no} " logic/checks.test.mjs\n```\n\nThe starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.\n\n## Explain the result\n\n{question}\n\nCompare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.\n'
    write(Path(folder)/'README.md',text)
write(Path('package.json'),json.dumps({"name":"plantopedia-tutorial-exercises","private":True,"type":"module","scripts":{"test":"node --test logic/checks.test.mjs","test:starter":"LAB_MODE=starter node --test logic/checks.test.mjs"}},indent=2))
print('Wrote ten exercise folders, logic workbook, and isolated TypeScript configuration.')

# Preserve a copy-ready Router tree while keeping fixture files out of routes.
for variant in ["starter", "solution"]:
    base = ROOT / "03-navigation" / variant
    for name in ["index.tsx", "[plantId].tsx"]:
        source = base / name
        content = source.read_text().replace('from "./data"', 'from "../../features/tutorial-navigation-data"')
        write(Path("03-navigation") / variant / "src/app/workshop" / name, content)
        source.unlink()
    write(Path("03-navigation") / variant / "src/features/tutorial-navigation-data.ts", (base / "data.ts").read_text())
    (base / "data.ts").unlink()
