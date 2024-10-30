import Link from 'next/link';
import { Surah } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

type Props = {
  surah: Surah;
};

export const SurahListItem = ({ surah }: Props) => {
  const { language, isRTL } = useLanguage();

  const getName = () => {
    switch (language) {
      case 'ar':
        return surah.name_arabic;
      case 'en':
        return surah.name_simple;
      default:
        return surah.translated_name.text || surah.name_simple;
    }
  };

  const surahStartingPage = surah.pages[0];
  return (
    <Link 
      href={`/pages/${surahStartingPage}`}
      className="flex items-center p-4 border-b border-gray-200 dark:border-gray-800 
        hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
    >
      <div className={`flex items-center justify-center w-12 h-12 rounded-full 
        border border-gray-300 dark:border-gray-700 
        bg-white dark:bg-gray-900 ${isRTL ? 'ml-4' : 'mr-4'}`}
      >
        <span className="text-lg text-gray-900 dark:text-gray-100">{surah.id}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 
              ${language === 'ar' ? 'font-surahnames text-2xl' : ''}`}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {getName()}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {surah.revelation_place} • {surah.verses_count} Verses
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};