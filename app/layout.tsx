import { Metadata, Viewport } from "next";
import { useLocale } from "next-intl";
import "./globals.css";
import { getLanguageDirection } from "./utils/i18n";
import localFont from "next/font/local";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

export const metadata: Metadata = {
  title: "Furqan",
  description: "The word focused Quran app",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/icons/icon-apple-180.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    // "default": opaque status bar, always visible, never overlays content.
    // Was "black-translucent" (Android's fullscreen counterpart had the same
    // always-visible-status-bar goal); reverted (#317) — see
    // docs/plans/feature-pwa-fullscreen-focus-mode.md Addendum. viewportFit:
    // cover + env(safe-area-inset-top) on the navbar are left in place; they
    // resolve to 0px with no translucent bar to clear, per spec.
    statusBarStyle: "default",
    title: "Furqan",
  },
};

export const viewport: Viewport = {
  themeColor: "#16232F",
  viewportFit: "cover",
};

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--tajawal",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
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
    <html
      lang={locale}
      className={`${ibmPlexSansArabic.variable} ${uthmanic.variable} ${surahNames.variable}`}
      suppressHydrationWarning
    >
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
        className="font-sans bg-background antialiased"
      >
        {children}
      </body>
    </html>
  );
}

