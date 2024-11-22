import { useTranslations as useNextIntlTranslations } from 'next-intl';

function useTranslations(namespace?: string) {
  const t = useNextIntlTranslations(namespace ?? undefined);

  return (key: string, defaultValue: string) => {
    const translation = t(key);
    return translation === key ? defaultValue : translation;
  };
}

export default useTranslations;