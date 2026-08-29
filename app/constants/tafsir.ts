import { TafsirEdition } from "@/app/types/tafsir";

export const DEFAULT_TAFSIR_ID = 16;

/**
 * Curated catalog of primary Arabic Quran commentaries supported in Furqan.
 * Verified against Quran.com QDC API v4.
 */
export const TAFSIR_EDITIONS: TafsirEdition[] = [
  {
    id: 16,
    slug: "ar-tafsir-muyassar",
    name: "التفسير الميسر",
    authorName: "مجمع الملك فهد لطباعة المصحف الشريف",
    languageName: "arabic",
    translatedName: "Tafsir Muyassar",
    direction: "rtl",
  },
  {
    id: 91,
    slug: "ar-tafseer-al-saddi",
    name: "تفسير السعدي (تيسير الكريم الرحمن)",
    authorName: "عبد الرحمن بن ناصر السعدي",
    languageName: "arabic",
    translatedName: "Tafsir Al-Sa'di",
    direction: "rtl",
  },
  {
    id: 14,
    slug: "ar-tafsir-ibn-kathir",
    name: "تفسير ابن كثير (تفسير القرآن العظيم)",
    authorName: "أبو الفداء إسماعيل بن كثير",
    languageName: "arabic",
    translatedName: "Tafsir Ibn Kathir",
    direction: "rtl",
  },
  {
    id: 94,
    slug: "ar-tafsir-al-baghawi",
    name: "تفسير البغوي (معالم التنزيل)",
    authorName: "الحسين بن مسعود البغوي",
    languageName: "arabic",
    translatedName: "Tafsir Al-Baghawi",
    direction: "rtl",
  },
  {
    id: 15,
    slug: "ar-tafsir-al-tabari",
    name: "تفسير الطبري (جامع البيان)",
    authorName: "محمد بن جرير الطبري",
    languageName: "arabic",
    translatedName: "Tafsir Al-Tabari",
    direction: "rtl",
  },
  {
    id: 90,
    slug: "ar-tafseer-al-qurtubi",
    name: "تفسير القرطبي (الجامع لأحكام القرآن)",
    authorName: "أبو عبد الله القرطبي",
    languageName: "arabic",
    translatedName: "Tafsir Al-Qurtubi",
    direction: "rtl",
  },
];

export function getTafsirEdition(id: number): TafsirEdition | undefined {
  return TAFSIR_EDITIONS.find((e) => e.id === id);
}
