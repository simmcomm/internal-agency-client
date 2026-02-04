export type FridStore = {
  /**
   * @param invalidateStale Only relevant if store supports expiring
   */
  getFrid(invalidateStale?: boolean): string | undefined;
  setFrid(frid: string, expire?: number): void;
}

export const createInMemoryFridStore = (): FridStore => {
  let inMemoryFrid: string;
  return {
    getFrid(): string | undefined {
      return inMemoryFrid;
    },
    setFrid(frid: string) {
      inMemoryFrid = frid;
    },
  };
};

/**
 * Creates LocalStorage (default) or SessionStorage frid store
 */
export const createWebStorageFridStore = (
  storage: Storage = window.localStorage,
  key: string = 'frid',
): FridStore => {
  return {
    getFrid(invalidateStale?: boolean): string | undefined {
      const frid = storage.getItem(key);
      if (frid !== null) return frid;
      return undefined;
    },
    setFrid(frid: string, expire?: number) {
      storage.setItem(key, frid);
    },
  };
};
