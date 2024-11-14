import { useTranslations as useNextIntlTranslations } from 'next-intl';

function useTranslations(namespace?: string) {
  const t = useNextIntlTranslations(namespace ?? undefined);

  return (key: string, defaultValue: string) => {
    try {
      const translation = t(key);
      return translation || defaultValue;
    } catch {
      return defaultValue;
    }
  };
}

export default useTranslations;