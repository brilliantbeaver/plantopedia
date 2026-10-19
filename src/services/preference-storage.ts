import * as SecureStore from "expo-secure-store";
export const preferenceStorage = {
  get: () => SecureStore.getItemAsync("plantopedia.preferences"),
  set: (value: string) =>
    SecureStore.setItemAsync("plantopedia.preferences", value),
};
