// import { VerticalQuranPages } from './components/VerticalQuranPages';

// export default async function VerticalReading() {
//   return (
//     <VerticalQuranPages />
//   );
// }

import { SurahList } from './components/SurahList';

async function getSurahs(language: string) {
  const response = await fetch(
    `https://api.qurancdn.com/api/qdc/chapters?language=${language}`,
    { next: { revalidate: 3600 } }
  );
  const data = await response.json();
  return data.chapters;
}

export default async function Home() {
  const surahs = await getSurahs('ar');

  return (
    <main className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-black min-h-screen">
      <SurahList surahs={surahs} />
    </main>
  );
}