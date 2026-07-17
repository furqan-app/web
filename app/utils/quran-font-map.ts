export function getPageFontFamily(page: number, tajweed = false) {
  return tajweed ? `quran-p${page}-tajweed` : `quran-p${page}`;
}
