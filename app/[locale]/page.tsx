import { setRequestLocale, getTranslations } from "next-intl/server";
import { SurahList } from "../components/SurahList";
import { getSurahs } from "../hooks/get-surahs";
import { Locale } from "../types/config";

export default async function Home({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const [surahs, t] = await Promise.all([getSurahs(), getTranslations()]);

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen max-w-6xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider mb-4">
          {t("home.badge")}
        </div>
        <h1 className="font-tajawal font-extrabold text-6xl leading-none text-foreground mb-3">
          {t("home.title")}
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-base leading-relaxed">
          {t("home.tagline")}
        </p>
      </div>
      <SurahList surahs={surahs} />
    </main>
  );
}
