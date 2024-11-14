import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from "next";
import localFont from "next/font/local";

import { Nav } from "@components/nav/Nav";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { QuranFontScaleProvider } from "@/app/contexts/QuranFontScaleContext";
import "../globals.css";

export const metadata: Metadata = {
  title: "Al-Furqan",
  description: "The word focused Quran app",
};

const surahNames = localFont({
  src: "../fonts/surah/v1/sura_names.ttf",
  variable: "--surah-names",
});

const Uthmanic = localFont({
  src: "../fonts/hafs/uthmanic/uthmanic.ttf",
  variable: "--uthmanic",
});

const RTL_LANGUAGES = ['ar'];

export function generateStaticParams() {
    return [{ locale: 'en' }, { locale: 'ar' }];
}

export default async function LocaleLayout({ children, params: { locale } }: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();
    const isRTL = RTL_LANGUAGES.includes(locale);

    return (
        <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
            <body suppressHydrationWarning
                className={`${surahNames.variable} ${Uthmanic.variable} bg-white dark:bg-black antialiased`}
            >
                <NextIntlClientProvider messages={messages}>
                    <QuranFontScaleProvider>
                        <QueryProvider>
                            <Nav />
                            {children}
                        </QueryProvider>
                    </QuranFontScaleProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}