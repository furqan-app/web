import { useLocale, useTranslations } from "next-intl";
import { SurahList } from "../components/SurahList";
import { getSurahs } from "../server/actions/getSurahs";

const AppTitle = () => {
  const t = useTranslations();
  return <span>{t('homepage.title')}</span>;
};

export default async function Home() {
  // const locale = useLocale();
  const surahs = await getSurahs('ar');

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center my-8 text-gray-900 dark:text-gray-100">
          <AppTitle />
        </h1>
        <SurahList surahs={surahs} />
      </div>
    </main>
  );
}

