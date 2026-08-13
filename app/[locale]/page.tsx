import { setRequestLocale, getTranslations } from "next-intl/server";
import { SurahList } from "../components/SurahList";
import { getSurahs } from "../hooks/get-surahs";
import { Locale } from "../types/config";
import { AppLaunchRedirect } from "../components/reader/AppLaunchRedirect";
import { getLanguageDirection } from "../utils/i18n";
import { cn } from "@/lib/utils";

// Bounds Hostinger CDN edge-cache poisoning to a 5-minute window instead of
// Next's default 1-year s-maxage (see ADR 0035).
export const revalidate = 300;

export default async function Home({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const [surahs, t] = await Promise.all([getSurahs(), getTranslations()]);
  const isRTL = getLanguageDirection(locale) === "rtl";

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen max-w-6xl">
      <AppLaunchRedirect />
      <div className="text-center mb-10">
        <h1 className="font-tajawal font-extrabold text-6xl leading-none text-foreground mb-3">
          {t("home.title")}
        </h1>
        <p
          className={cn(
            "mx-auto text-muted-foreground text-base leading-relaxed",
            isRTL ? "max-w-3xl" : "max-w-2xl",
          )}
        >
          {t("home.tagline")}
        </p>
      </div>
      <SurahList surahs={surahs} />
    </main>
  );
}
