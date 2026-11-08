export const featureStorage = {
  async read(owner: string, key: string): Promise<unknown> {
    const raw = localStorage.getItem(`plantopedia.feature.${owner}.${key}`);
    return raw ? (JSON.parse(raw) as unknown) : null;
  },
  async update(
    owner: string,
    key: string,
    change: (value: unknown) => unknown,
  ) {
    const update = () => {
      const storageKey = `plantopedia.feature.${owner}.${key}`;
      const raw = localStorage.getItem(storageKey);
      const value = change(raw ? (JSON.parse(raw) as unknown) : null);
      localStorage.setItem(storageKey, JSON.stringify(value));
      return value;
    };
    if (typeof navigator !== "undefined" && navigator.locks)
      return navigator.locks.request(`plantopedia.${owner}.${key}`, update);
    return update();
  },
};
