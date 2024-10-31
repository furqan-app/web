import type { Metadata } from "next";
import { Nav } from "./components/nav/Nav";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "./providers/QueryProvider";

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
    <html lang="ar">
      <body
        className={`${surahNames.variable} ${Uthmanic.variable} bg-white dark:bg-black antialiased`}
      >
        <Nav />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

