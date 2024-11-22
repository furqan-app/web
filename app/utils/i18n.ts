const RTL_LANGUAGES = ['ar'];

export function getLanguageDirection(language: string) {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}
