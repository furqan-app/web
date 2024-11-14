import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { convertFlatToNested } from '@/app/utils/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const flatMessages = (await import(`../messages/${locale}.json`)).default;
  const messages = convertFlatToNested(flatMessages);

  return {
    locale,
    messages,
  };
});