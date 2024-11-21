import type { Metadata } from "next";
import localFont from "next/font/local";

import { Nav } from "@components/nav/Nav";
import { QueryProvider } from "./providers/QueryProvider";
import SessionProvider from "@/app/providers/SessionProvider";
// import { LanguageProvider } from "@contexts/LanguageContext";
import { QuranFontScaleProvider } from "@/app/contexts/QuranFontScaleContext";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/options";

export const metadata: Metadata = {
  title: "Al-Furqan",
  description: "The word focused Quran app",
};

const surahNames = localFont({
  src: "./fonts/surah/v1/sura_names.ttf",
  variable: "--surah-names",
});

const Uthmanic = localFont({
  src: "./fonts/hafs/uthmanic/uthmanic.ttf",
  variable: "--uthmanic",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html>
      <body
        suppressHydrationWarning
        className={`${surahNames.variable} ${Uthmanic.variable} bg-white dark:bg-black antialiased`}
      >
        {/* <LanguageProvider> */}
        <SessionProvider session={session}>
          <QuranFontScaleProvider>
            <QueryProvider>
              <Nav />
              {children}
            </QueryProvider>
          </QuranFontScaleProvider>
        </SessionProvider>
        {/* </LanguageProvider> */}
      </body>
    </html>
  );
}

