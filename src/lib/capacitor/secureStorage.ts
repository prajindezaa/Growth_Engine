import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

/**
 * SecureStorage interface providing transparent encryption / secure storage
 * when running inside Capacitor Android/iOS, and falling back safely to localStorage on web.
 */
export const SecureStorage = {
  /**
   * Set a sensitive key-value pair
   */
  async set(key: string, value: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key, value });
      } else if (typeof window !== "undefined") {
        window.localStorage.setItem(`ge_sec_${key}`, value);
      }
    } catch (err) {
      console.error("[SecureStorage] set error:", err);
    }
  },

  /**
   * Retrieve a sensitive key-value pair
   */
  async get(key: string): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key });
        return value;
      } else if (typeof window !== "undefined") {
        return window.localStorage.getItem(`ge_sec_${key}`);
      }
      return null;
    } catch (err) {
      console.error("[SecureStorage] get error:", err);
      return null;
    }
  },

  /**
   * Remove a key
   */
  async remove(key: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key });
      } else if (typeof window !== "undefined") {
        window.localStorage.removeItem(`ge_sec_${key}`);
      }
    } catch (err) {
      console.error("[SecureStorage] remove error:", err);
    }
  },

  /**
   * Clear all stored secure keys
   */
  async clear(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.clear();
      } else if (typeof window !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith("ge_sec_")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch (err) {
      console.error("[SecureStorage] clear error:", err);
    }
  },
};
