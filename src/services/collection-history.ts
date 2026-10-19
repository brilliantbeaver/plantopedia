import * as SecureStore from "expo-secure-store";

export const collectionHistory = {
  async read(owner: string): Promise<boolean | null> {
    const value = await SecureStore.getItemAsync(
      `plantopedia.collection.${owner}`,
    );
    return value === "saved" ? true : value === "empty" ? false : null;
  },
  async write(owner: string, hasPlants: boolean) {
    await SecureStore.setItemAsync(
      `plantopedia.collection.${owner}`,
      hasPlants ? "saved" : "empty",
    );
  },
  async clear(owner: string) {
    await SecureStore.deleteItemAsync(`plantopedia.collection.${owner}`);
  },
};
