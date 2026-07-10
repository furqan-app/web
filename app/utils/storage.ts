import { QuranFontScale, QuranSafhaView } from "@types";
import { RecitationSettings } from "@/app/types/recitation";

export type StorageKey = 'theme' | 'quranFontScale' | 'quranSafhaView' | 'recitationSettings';

type StorageValueType = {
  theme: 'light' | 'dark' | 'gold';
  quranFontScale: QuranFontScale;
  quranSafhaView: QuranSafhaView;
  recitationSettings: RecitationSettings;
};

export const storage = {
  get: <K extends StorageKey>(key: K): StorageValueType[K] | null => {
    if (typeof window === "undefined") return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Error reading ${key} from localStorage:`, error);
      localStorage.removeItem(key);
      return null;
    }
  },
  
  set: <K extends StorageKey>(key: K, value: StorageValueType[K]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error writing ${key} to localStorage:`, error);
    }
  },

  remove: (key: StorageKey) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing ${key} from localStorage:`, error);
    }
  },

  clear: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }
  }
};
