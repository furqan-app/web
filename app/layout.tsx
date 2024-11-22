import { Metadata } from "next";
import { useLocale } from "next-intl";
import "./globals.css";
import { getLanguageDirection } from "./utils/i18n";

export const metadata: Metadata = {
  title: "Al-Furqan",
  description: "The word focused Quran app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  return (
    <html lang={locale}>
      <body suppressHydrationWarning dir={getLanguageDirection(locale)} className="bg-white dark:bg-black antialiased">{children}</body>
    </html>
  );
}
