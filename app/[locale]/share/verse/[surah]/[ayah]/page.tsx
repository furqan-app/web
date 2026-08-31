import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Locale } from "@/app/types/config";
import { routing } from "@/i18n/routing";
import { highlight } from "@/app/utils/highlight";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { getShareVerseData } from "./verse-data";
import { parseSegment } from "./params";

// Bounded revalidate matches the reader routes (ADR 0035 / ADR 0050). The route
// stays on-demand because it has no generateStaticParams — never pre-render
// 6236×2 pages.
export const revalidate = 300;
export const dynamicParams = true;

type ShareVersePageProps = {
  params: { locale: Locale; surah: string; ayah: string };
};

function redirectPath(locale: Locale, pageNumber: number, verseKey: string): string {
  return `/${locale}${highlight.addToUrl({
    verseKey,
    pageNumber,
    type: "selection",
    basePath: "/pages",
  })}`;
}

async function resolve({ locale, surah, ayah }: ShareVersePageProps["params"]) {
  if (!routing.locales.includes(locale)) return null;
  const surahNum = parseSegment(surah);
  const ayahNum = parseSegment(ayah);
  if (surahNum === null || ayahNum === null) return null;
  return getShareVerseData(surahNum, ayahNum);
}

export async function generateMetadata({
  params,
}: ShareVersePageProps): Promise<Metadata> {
  const data = await resolve(params);
  if (!data) notFound();

  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "markModal" });
  const surahName = locale === "ar" ? data.surahNameArabic : data.surahNameSimple;
  const ref = t("shareVersePageTitle", {
    surah: surahName,
    ayah: toLocaleNumeral(data.ayahNum, locale),
  });

  // No per-verse OG image — Satori can't shape Arabic, and a dedicated
  // rendering pipeline (headless browser / pre-gen) is a separate task. The
  // verse text rides in the description; the card image falls back to the
  // app icon. See docs/plans/copy-share-verses.md Addendum. `noindex` — these
  // 12k redirect URLs have no standalone content worth indexing.
  return {
    title: ref,
    description: data.plainText,
    robots: { index: false, follow: true },
    openGraph: {
      title: ref,
      description: data.plainText,
      type: "article",
      url: `/${locale}/share/verse/${data.surahNum}/${data.ayahNum}`,
      siteName: "Furqan",
      images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
    },
    twitter: {
      card: "summary",
      title: ref,
      description: data.plainText,
      images: ["/icons/icon-512.png"],
    },
  };
}

export default async function ShareVersePage({ params }: ShareVersePageProps) {
  const { locale } = params;
  setRequestLocale(locale);

  const data = await resolve(params);
  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "markModal" });
  const target = redirectPath(locale, data.pageNumber, data.verseKey);
  const surahName = locale === "ar" ? data.surahNameArabic : data.surahNameSimple;

  // Metadata-only shim: crawlers read the OG tags from generateMetadata above;
  // humans are bounced to the canonical reader (verse highlighted on arrival via
  // the 'selection' highlight param). Never the server redirect() helper — its
  // 307 has no body, so a crawler never sees the OG tags (ADR 0050). JS
  // visitors get location.replace(); the <noscript> meta-refresh covers the
  // rest without also firing for JS visitors; the link is the last resort.
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${target}`} />
      </noscript>
      <p className="text-sm text-muted-foreground">
        {surahName} · {toLocaleNumeral(data.ayahNum, locale)}
      </p>
      <a href={target} className="text-primary underline">
        {t("shareVerseOpenReader")}
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: `location.replace(${JSON.stringify(target)})`,
        }}
      />
    </main>
  );
}
