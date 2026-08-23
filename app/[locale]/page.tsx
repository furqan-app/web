import { setRequestLocale } from "next-intl/server";
import { SurahList } from "../components/SurahList";
import { HomeHero } from "../components/home/HomeHero";
import { HomeRecommendedSurahs } from "../components/home/HomeRecommendedSurahs";
import { HomeContinueReadingCard } from "../components/home/HomeContinueReadingCard";
import { getSurahs } from "../hooks/get-surahs";
import { Locale } from "../types/config";
import { getLanguageDirection } from "../utils/i18n";

// Bounds Hostinger CDN edge-cache poisoning to a 5-minute window instead of
// Next's default 1-year s-maxage (see ADR 0035).
export const revalidate = 300;

export default async function Home({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const surahs = await getSurahs();
  const isRTL = getLanguageDirection(locale) === "rtl";

  return (
    <main className="container mx-auto px-4 py-8 md:py-10 min-h-screen max-w-5xl">
      <HomeHero isRTL={isRTL} />
      <HomeContinueReadingCard surahs={surahs} />
      <HomeRecommendedSurahs surahs={surahs} />
      <SurahList surahs={surahs} />
    </main>
  );
}
