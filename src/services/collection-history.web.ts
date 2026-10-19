export const collectionHistory = {
  async read(owner: string): Promise<boolean | null> {
    const value = localStorage.getItem(`plantopedia.collection.${owner}`);
    return value === "saved" ? true : value === "empty" ? false : null;
  },
  async write(owner: string, hasPlants: boolean) {
    localStorage.setItem(
      `plantopedia.collection.${owner}`,
      hasPlants ? "saved" : "empty",
    );
  },
  async clear(owner: string) {
    localStorage.removeItem(`plantopedia.collection.${owner}`);
  },
};
