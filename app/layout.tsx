import type { Metadata } from "next";
import localFont from "next/font/local";

import { Nav } from "@components/nav/Nav";
import { QueryProvider } from "./providers/QueryProvider";
// import { LanguageProvider } from "@contexts/LanguageContext";
import { QuranFontScaleProvider } from "@/app/contexts/QuranFontScaleContext";
import { ThemeProvider } from "@contexts/ThemeContext";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body suppressHydrationWarning
        className={`${surahNames.variable} ${Uthmanic.variable} bg-white dark:bg-black antialiased`}
      >
        <ThemeProvider>
          {/* <LanguageProvider> */}
          <QuranFontScaleProvider>
            <QueryProvider>
              <Nav />
              {children}
            </QueryProvider>
          </QuranFontScaleProvider>
          {/* </LanguageProvider> */}
        </ThemeProvider>
      </body>
    </html>
  );
}

