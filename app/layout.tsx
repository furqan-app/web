import { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Al-Furqan",
  description: "The word focused Quran app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-black antialiased">{children}</body>
    </html>
  );
}

