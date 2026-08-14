import { DesktopQuranFontSize, QuranSafhaView } from "@types";
import { RecitationSettings } from "@/app/types/recitation";

export type StorageKey = 'theme' | 'desktopQuranFontSize' | 'quranSafhaView' | 'recitationSettings' | 'quranMushafId' | 'quranTajweedMode' | 'lastReadPage' | 'lastReadPath' | 'keepScreenAwake';

type StorageValueType = {
  theme: 'light' | 'dark' | 'gold';
  desktopQuranFontSize: DesktopQuranFontSize;
  quranSafhaView: QuranSafhaView;
  recitationSettings: RecitationSettings;
  // Active mushaf edition (ADR 0033). `quranTajweedMode` is the superseded
  // boolean, still read once to migrate an existing reader's choice.
  quranMushafId: number;
  quranTajweedMode: boolean;
  // Last self-reader page visited (plain page number of whatever edition was
  // active at the time — same convention as any deep link, see
  // MushafSwitchSync). Never written for the shared-mushaf grant reader.
  lastReadPage: number;
  // The same position as a full locale-prefixed path ("/ar/pages/300"), written
  // together with lastReadPage from the one site in LastReadPageContext. It
  // exists for public/launch.html, which runs before React and therefore has no
  // way to resolve a locale — storing the path means that script needs no
  // locale detection at all (ADR 0042). Two write sites would let the launch
  // redirect and ContinueReadingLink disagree about where the user left off.
  lastReadPath: string;
  // Whether the mobile/tablet Wake Lock toggle is on. Default true, applied
  // when this key is absent (never written yet) — see KeepScreenAwakeContext.
  keepScreenAwake: boolean;
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
