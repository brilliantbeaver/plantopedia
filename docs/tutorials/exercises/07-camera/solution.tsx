import { SafeAreaView } from "react-native-safe-area-context";
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
