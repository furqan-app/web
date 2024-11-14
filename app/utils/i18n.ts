import _ from 'lodash';

const RTL_LANGUAGES = ['ar'];

export function convertFlatToNested(flatMessages: Record<string, string>): Record<string, any> {
  return Object.entries(flatMessages).reduce((acc, [key, value]) => {
    _.set(acc, key, value);
    return acc;
  }, {});
}

export function getLanguageFromPathname(pathname: string) {
  const langMatch = pathname.match(/^\/([a-z]{2})/);
  return langMatch?.[1];
}

export function getLanguageDirection(language: string) {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}
