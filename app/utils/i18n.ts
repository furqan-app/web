const RTL_LANGUAGES = ['ar'];

export function getLanguageDirection(language: string) {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toLocaleNumeral(n: number, locale: string): string {
  const str = String(n);
  if (locale !== 'ar') return str;
  return str.split('').map(d => EASTERN_ARABIC_DIGITS[+d] ?? d).join('');
}
