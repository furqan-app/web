import { Metadata } from "next";
import { useLocale } from "next-intl";
import "./globals.css";
import { getLanguageDirection } from "./utils/i18n";
import localFont from "next/font/local";

export const metadata: Metadata = {
  title: "Al-Furqan",
  description: "The word focused Quran app",
};

const uthmanic = localFont({
  src: "./fonts/hafs/uthmanic/uthmanic.ttf",
  variable: "--uthmanic",
});

const surahNames = localFont({
  src: "./fonts/surah/v1/sura_names.ttf",
  variable: "--surah-names",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  return (
    <html lang={locale}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=JSON.parse(localStorage.getItem('theme'));if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        dir={getLanguageDirection(locale)}
        className={`${uthmanic.variable} ${surahNames.variable} bg-white dark:bg-black antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

