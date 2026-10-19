import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "Plantopedia",
  slug: "plantopedia",
  owner: "theodoremui",
  extra: { eas: { projectId: "5c93e32b-cea7-4957-bf55-34fd8f4d5acc" } },
  version: "0.1.0",
  scheme: "plantopedia",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.plantopedia.companion",
    infoPlist: {
      NSCameraUsageDescription:
        "Photograph plants to preserve evidence and explore identification suggestions.",
      NSMicrophoneUsageDescription:
        "Talk with your AI plant companion when you start a voice conversation.",
    },
  },
  android: {
    package: "app.plantopedia.companion",
    permissions: ["CAMERA", "RECORD_AUDIO"],
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundColor: "#166534",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-localization",
    "expo-web-browser",
    "@clerk/expo",
    [
      "expo-camera",
      {
        cameraPermission: "Photograph plants to preserve your observations.",
        microphonePermission: "Talk with your plant companion.",
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Choose plant photographs to add to your private collection.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Talk with your AI plant companion when you start Voice Chat.",
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
  ],
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  experiments: { typedRoutes: true },
};
export default config;
