import useTranslations from "../hooks/use-translations";
import { SurahListClient } from "../components/SurahListClient";

const AppTitle = () => {
  const t = useTranslations();
  return <span>{t('home.title', 'Furqan')}</span>;
};

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center my-8 text-gray-900 dark:text-gray-100">
          <AppTitle />
        </h1>
        <SurahListClient />
      </div>
    </main>
  );
}

