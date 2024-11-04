import { SurahList } from "./components/SurahList";
import { getSurahs } from "./server/actions/getSurahs";

const AppTitle = ({ language }: { language: string }) => {
  if (language === "ar") {
    return <span>القرآن الكريم</span>;
  }
  return <span>{`Al-Qur'an`}</span>;
};

export default async function Home() {
  const { language, isRTL } = { language: "ar", isRTL: true }; // useLanguage();
  const surahs = await getSurahs(language);

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-4xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
        <h1 className="text-3xl font-bold text-center my-8 text-gray-900 dark:text-gray-100">
          <AppTitle language={language} />
        </h1>
        <SurahList surahs={surahs} />
      </div>
    </main>
  );
}

