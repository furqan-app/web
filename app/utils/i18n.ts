import _ from 'lodash';

export function convertFlatToNested(flatMessages: Record<string, string>): Record<string, any> {
  return Object.entries(flatMessages).reduce((acc, [key, value]) => {
    _.set(acc, key, value);
    return acc;
  }, {});
}