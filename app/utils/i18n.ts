import _ from 'lodash';

const RTL_LANGUAGES = ['ar'];

export function convertFlatToNested(flatMessages: Record<string, string>): Record<string, any> {
  return Object.entries(flatMessages).reduce((acc, [key, value]) => {
    _.set(acc, key, value);
    return acc;
  }, {});
}

export function getLanguageDirection(language: string) {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}
