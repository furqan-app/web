import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export const LanguageToggle = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = useLocale();

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${newLang}`);
    router.push(newPath);
  };

  return (
    <div className="flex items-center justify-between">
      <span className="mr-2 text-sm font-medium">
        {currentLang === 'en' ? 'English' : 'عربي'}
      </span>
      <button
        onClick={toggleLanguage}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
          currentLang === 'en' ? 'bg-blue-500' : 'bg-green-500'
        }`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
            currentLang === 'en' ? 'translate-x-1' : 'translate-x-6'
          } ${currentLang === 'ar' ? 'rtl:translate-x-1' : 'rtl:translate-x-6'}`}
        />
      </button>
    </div>
  );
};