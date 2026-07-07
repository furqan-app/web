import { Metadata, Viewport } from "next";
import { useLocale } from "next-intl";
import "./globals.css";
import { getLanguageDirection } from "./utils/i18n";
import localFont from "next/font/local";
import { Tajawal } from "next/font/google";

export const metadata: Metadata = {
  title: "Furqan",
  description: "The word focused Quran app",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Furqan",
  },
};

export const viewport: Viewport = {
  themeColor: "#16232F",
};

const tajawal = Tajawal({
  weight: ["400", "500", "700", "800"],
  subsets: ["arabic", "latin"],
  variable: "--tajawal",
  display: "swap",
});

const uthmanic = localFont({
  src: [
    { path: "./fonts/hafs/uthmanic/UthmanicHafs1Ver18.woff2" },
    { path: "./fonts/hafs/uthmanic/UthmanicHafs1Ver18.ttf" },
  ],
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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var el=document.documentElement;var t=JSON.parse(localStorage.getItem('theme'));if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){el.classList.add('dark','theme-dark')}else if(t==='gold'){el.classList.add('theme-gold')}else{el.classList.add('theme-light')}var v=JSON.parse(localStorage.getItem('quranSafhaView'));el.setAttribute('data-safha-view',v==='single'?'single':'double')}catch(e){document.documentElement.setAttribute('data-safha-view','double')}`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        dir={getLanguageDirection(locale)}
        className={`${tajawal.variable} ${uthmanic.variable} ${surahNames.variable} bg-background antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

