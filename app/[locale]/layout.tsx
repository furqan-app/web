import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

import { Nav } from "@components/nav/Nav";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { QuranFontScaleProvider } from "@/app/contexts/QuranFontScaleContext";
import { QuranSafhaViewProvider } from "@/app/contexts/QuranSafhaViewContext";
import { QuranTajweedProvider } from "@/app/contexts/QuranTajweedContext";
import { RecitationProvider } from "@/app/contexts/RecitationContext";
import { SidebarProvider } from "@/app/contexts/SidebarContext";
import { RecitationPlayerBar } from "@components/RecitationPlayerBar";
import { RecitationSettingsSheet } from "@components/RecitationSettingsSheet";
import "../globals.css";
import { getLanguageDirection } from "../utils/i18n";
import { Locale } from "../types/config";
import SessionProvider from "@/app/providers/SessionProvider";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <div
      dir={getLanguageDirection(locale)}
      className="bg-background antialiased"
    >
      <NextIntlClientProvider messages={messages}>
        <SessionProvider>
          <QuranFontScaleProvider>
            <QuranTajweedProvider>
              <QuranSafhaViewProvider>
                <RecitationProvider>
                  <QueryProvider>
                    <SidebarProvider>
                      <Nav />
                      {children}
                      <RecitationPlayerBar />
                      <RecitationSettingsSheet />
                    </SidebarProvider>
                  </QueryProvider>
                </RecitationProvider>
              </QuranSafhaViewProvider>
            </QuranTajweedProvider>
          </QuranFontScaleProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    </div>
  );
}

