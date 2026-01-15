import useTranslations from "../hooks/use-translations";
import { SurahList } from "../components/SurahList";
import { getSurahs } from "../hooks/use-surahs";

// Remove this when the whole app is at build time
export const dynamic = 'force-dynamic';

const AppTitle = () => {
  const t = useTranslations();
  return <span>{t('home.title', 'Furqan')}</span>;
};

export default async function Home() {
  const surahs = await getSurahs();
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

