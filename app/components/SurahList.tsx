'use client';

import { useEffect, useState } from 'react';
import { Surah } from '@types';
import { SurahListItem } from '@components/SurahListItem';
import { useLanguage } from '@contexts/LanguageContext';

type Props = {
  surahs: Surah[];
};

export const SurahList = ({ surahs: initialSurahs }: Props) => {
  const { language, isRTL } = useLanguage();
  const [surahs, setSurahs] = useState(initialSurahs);

  useEffect(() => {
    const fetchSurahs = async () => {
      const response = await fetch(
        `https://api.qurancdn.com/api/qdc/chapters?language=${language}`
      );
      const data = await response.json();
      setSurahs(data.chapters);
    };

    fetchSurahs();
  }, [language]);

  const getTitle = () => {
    switch (language) {
      case 'ar':
        return 'القرآن الكريم';
      default:
        return 'The Holy Quran';
    }
  };

  return (
    <div className="max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold text-center my-8 text-gray-900 dark:text-gray-100">
        {getTitle()}
      </h1>
      <div className="bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900 
        rounded-lg border border-gray-200 dark:border-gray-800"
      >
        {surahs.map((surah) => (
          <SurahListItem key={surah.id} surah={surah} />
        ))}
      </div>
    </div>
  );
};
