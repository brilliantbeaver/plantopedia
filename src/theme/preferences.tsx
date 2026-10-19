import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { Preferences, defaultPreferences } from "@plantopedia/contracts";
import { en, type CopyKey } from "../i18n/locales/en";
import { dictionary as fr } from "../i18n/locales/fr";
import { dictionary as es } from "../i18n/locales/es";
import { dictionary as de } from "../i18n/locales/de";
import { dictionary as zh } from "../i18n/locales/zh-Hans";
import { dictionary as ja } from "../i18n/locales/ja";
import { dictionary as ko } from "../i18n/locales/ko";
import { preferenceStorage } from "../services/preference-storage";
export const dictionaries = { en, fr, es, de, "zh-Hans": zh, ja, ko };
const light = {
  canvas: "#F4F7F3",
  surface: "#FFFFFF",
  text: "#14241B",
  secondary: "#4A5E50",
  primary: "#166534",
  onPrimary: "#FFFFFF",
  border: "#CAD7CD",
  muted: "#E3EDE0",
  danger: "#A32323",
};
const dark = {
  canvas: "#101C16",
  surface: "#1D2C23",
  text: "#F3FAF4",
  secondary: "#B9CBBE",
  primary: "#A8E6A3",
  onPrimary: "#102417",
  border: "#40574A",
  muted: "#2B4032",
  danger: "#FFB4A9",
};
interface Value {
  preferences: Preferences;
  setPreferences: (value: Preferences) => void;
  colors: typeof light;
  mode: "light" | "dark";
  t: (key: CopyKey) => string;
}
const Context = createContext<Value | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setValue] = useState<Preferences>(defaultPreferences);
  const system = useColorScheme();
  useEffect(() => {
    let mounted = true;
    void preferenceStorage
      .get()
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = Preferences.safeParse(JSON.parse(raw));
        if (parsed.success) setValue(parsed.data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);
  function setPreferences(value: Preferences) {
    setValue(value);
    void preferenceStorage.set(JSON.stringify(value)).catch(() => undefined);
  }
  const mode =
    preferences.theme === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : preferences.theme;
  return (
    <Context.Provider
      value={{
        preferences,
        setPreferences,
        mode,
        colors: mode === "dark" ? dark : light,
        t: (key) => dictionaries[preferences.locale][key],
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("PreferencesProvider required");
  return context;
}
