import { QuranFontScale, QuranSafhaView } from "@types";
import { RecitationSettings } from "@/app/types/recitation";

export type StorageKey = 'theme' | 'quranFontScale' | 'quranSafhaView' | 'recitationSettings' | 'quranMushafId' | 'quranTajweedMode' | 'desktopFocusMode';

type StorageValueType = {
  theme: 'light' | 'dark' | 'gold';
  quranFontScale: QuranFontScale;
  quranSafhaView: QuranSafhaView;
  recitationSettings: RecitationSettings;
  // Active mushaf edition (ADR 0033). `quranTajweedMode` is the superseded
  // boolean, still read once to migrate an existing reader's choice.
  quranMushafId: number;
  quranTajweedMode: boolean;
  // Desktop (>=1367px) focus-mode preference (ADR 0034) — persists across
  // navigation/sessions like quranSafhaView.
  desktopFocusMode: boolean;
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
