/* eslint-disable @typescript-eslint/no-unused-vars -- Starter bindings are intentionally reserved for the learner to implement. */
import { CameraView, useCameraPermissions } from "expo-camera";
import { Text, View } from "react-native";
export default function Workshop() {
  const [permission, requestPermission] = useCameraPermissions();
  // TODO: handle loading, denial, canAskAgain=false, readiness and a busy capture.
  // Keep the CameraView mounted only while this route has focus.
  return <View style={{ flex: 1, padding: 24 }}><Text>Build the permission flow before taking a photograph.</Text></View>;
}
