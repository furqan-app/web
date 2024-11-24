import { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";

const Uthmanic = localFont({
  src: "./fonts/hafs/uthmanic/uthmanic.ttf",
  variable: "--uthmanic",
});

export const metadata: Metadata = {
  title: "Al-Furqan",
  description: "The word focused Quran app",
};

const surahNames = localFont({
  src: "./fonts/surah/v1/sura_names.ttf",
  variable: "--surah-names",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${Uthmanic.variable} ${surahNames.variable} bg-white dark:bg-black antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

