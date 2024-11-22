import Link from 'next/link';
import useTranslations from './hooks/use-translations';

export default function Custom404() {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="text-center px-4">
        <h1 className="text-8xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <div className="mt-4 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
            {t('notFound.title', '404 - Page Not Found')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            {t('notFound.description', 'Sorry, the page you are looking for does not exist.')}
          </p>
        </div>
        <Link 
          href="/" 
          className="inline-block mt-8 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
        >
          {t('notFound.homeLink', 'Go back to Home')}
        </Link>
      </div>
    </div>
  );
}
