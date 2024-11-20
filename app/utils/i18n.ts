const RTL_LANGUAGES = ['ar'];

export function convertFlatToNested(flatMessages: Record<string, string>): Record<string, any> {
  return Object.entries(flatMessages).reduce((acc, [key, value]) => {
    const keys = key.split('.');
    let current = acc;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = current[keys[i]] || {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    return acc;
  }, {} as Record<string, any>);
}

export function getLanguageDirection(language: string) {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}
