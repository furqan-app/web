import type { Metadata } from "next";
import { Nav } from "./components/nav/Nav";
import localFont from "next/font/local";
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

const page45 = localFont({
  src: "./fonts/hafs/v1/ttf/p45.ttf",
  variable: "--page-45",
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body className={`${surahNames.variable} ${Uthmanic.variable} ${page45.variable} bg-white dark:bg-black antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
