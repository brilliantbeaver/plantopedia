export const preferenceStorage = {
  async get() {
    return localStorage.getItem("plantopedia.preferences");
  },
  async set(value: string) {
    localStorage.setItem("plantopedia.preferences", value);
  },
};
