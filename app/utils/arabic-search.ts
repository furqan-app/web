const HAMZA_ALIF_PATTERN = /[أإآ]/g;
const EASTERN_DIGITS_PATTERN = /[٠-٩۰-۹]/g;

export const normalizeArabicQuery = (query: string): string =>
  query.replace(HAMZA_ALIF_PATTERN, "ا");

export const normalizeDigits = (str: string): string =>
  str.replace(EASTERN_DIGITS_PATTERN, (d) => {
    const code = d.charCodeAt(0);
    // 1632 is Arabic-Indic ٠ (0x0660), 1776 is Extended Arabic-Indic ۰ (0x06F0)
    return String(code >= 1776 ? code - 1776 : code - 1632);
  });

