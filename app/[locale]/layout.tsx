import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

import { Nav } from "@components/nav/Nav";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { QuranFontScaleProvider } from "@/app/contexts/QuranFontScaleContext";
import "../globals.css";
import { getLanguageDirection } from "../utils/i18n";
import { Locale } from "../types/config";
import SessionProvider from "@/app/providers/SessionProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/options";

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
  const session = await getServerSession(authOptions);
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <div
      dir={getLanguageDirection(locale)}
      className="bg-white dark:bg-black antialiased"
    >
      <NextIntlClientProvider messages={messages}>
        <SessionProvider session={session}>
          <QuranFontScaleProvider>
            <QueryProvider>
              <Nav />
              {children}
            </QueryProvider>
          </QuranFontScaleProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    </div>
  );
}

