import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

import { Nav } from "@components/nav/Nav";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { DesktopQuranFontSizeProvider } from "@/app/contexts/DesktopQuranFontSizeContext";
import { QuranSafhaViewProvider } from "@/app/contexts/QuranSafhaViewContext";
import { QuranMushafProvider } from "@/app/contexts/QuranMushafContext";
import { RecitationProvider } from "@/app/contexts/RecitationContext";
import { SidebarProvider } from "@/app/contexts/SidebarContext";
import { NavOverlayProvider } from "@/app/contexts/NavOverlayContext";
import { ReaderPageProvider } from "@/app/contexts/ReaderPageContext";
import { ReaderNavigationProvider } from "@/app/contexts/ReaderNavigationContext";
import { LastReadPageProvider } from "@/app/contexts/LastReadPageContext";
import { KeepScreenAwakeProvider } from "@/app/contexts/KeepScreenAwakeContext";
import { TafsirProvider } from "@/app/contexts/TafsirContext";
import { RecitationPlayerBar } from "@components/RecitationPlayerBar";
import { RecitationSettingsSheet } from "@components/RecitationSettingsSheet";
import { PlansWidget } from "@components/plans/PlansWidget";
import { LastReadPageSync } from "@components/reader/LastReadPageSync";
import { TafsirReaderSync } from "@components/tafsir/TafsirReaderSync";
import { KeepScreenAwakeSync } from "@components/KeepScreenAwakeSync";
import { OfflineSetupGate } from "@components/offline/OfflineSetupGate";
import { OfflineInstallPrompt } from "@components/offline/OfflineInstallPrompt";
import { SwUpdateBanner } from "@components/offline/SwUpdateBanner";
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
          <DesktopQuranFontSizeProvider>
            <QuranMushafProvider>
              <QuranSafhaViewProvider>
                <RecitationProvider>
                  <QueryProvider>
                    <TafsirProvider>
                      <SidebarProvider>
                        <NavOverlayProvider>
                          <ReaderPageProvider>
                            <ReaderNavigationProvider>
                              <LastReadPageProvider>
                                <KeepScreenAwakeProvider>
                                  <SwUpdateBanner />
                                  <Nav />
                                  {children}
                                  <RecitationPlayerBar />
                                  <RecitationSettingsSheet />
                                  <PlansWidget />
                                  <LastReadPageSync />
                                  <TafsirReaderSync />
                                  <KeepScreenAwakeSync />
                                  <OfflineInstallPrompt />
                                  <OfflineSetupGate />
                                </KeepScreenAwakeProvider>
                              </LastReadPageProvider>
                            </ReaderNavigationProvider>
                          </ReaderPageProvider>
                        </NavOverlayProvider>
                      </SidebarProvider>
                    </TafsirProvider>
                  </QueryProvider>
                </RecitationProvider>
              </QuranSafhaViewProvider>
            </QuranMushafProvider>
          </DesktopQuranFontSizeProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    </div>
  );
}
