const HAMZA_ALIF_PATTERN = /[أإآ]/g;

export const normalizeArabicQuery = (query: string): string =>
  query.replace(HAMZA_ALIF_PATTERN, "ا");
