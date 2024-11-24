import { useRubs } from "@/app/hooks/use-rubs";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@/app/hooks/use-translations";

const RubList = () => {
    const { data: rubs, error: rubsError, isLoading: rubsLoading } = useRubs();
    const locale = useLocale();
    const t = useTranslations();

    const Placeholder = () => (
        <div className="flex flex-col gap-4 p-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
    );

    const ErrorMessage = ({ message }: { message: string }) => (
        <div className="text-center text-red-600 dark:text-red-400 p-4 rounded-lg">
          <p className="font-medium">Error loading rubs</p>
          <p className="text-sm">{message}</p>
        </div>
    );

    const getJuzNumber = (rubNumber: number) => {
        return Math.ceil(rubNumber / 8);
    };

    return <div>
        <h2 className="text-lg font-bold">{t('rubs', 'Rubs')}</h2>
        {rubsLoading && <Placeholder />}
        {rubsError && <ErrorMessage message={rubsError.message} />}
        {rubs && (
            <ul className="space-y-2">
                {rubs.map((rub: any, index: number) => (
                    <>
                        {index > 0 && getJuzNumber(rub.rub_number) !== getJuzNumber(rubs[index - 1].rub_number) && (
                            <div className="my-4 border-t border-gray-300 dark:border-gray-700 pt-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('juz', 'Juz')} {getJuzNumber(rub.rub_number)}</span>
                            </div>
                        )}
                        <li key={rub.id} className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <Link
                                href={`/pages/${rub.startVerse.page_number}`}
                                locale={locale}
                                className="block p-3 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{t('rub', 'Rub')} {rub.rub_number}</span>
                                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                        {t('page', 'Page')} {rub.startVerse.page_number}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-arabic">
                                    {rub.startVerse.text_uthmani}
                                </p>
                            </Link>
                        </li>
                    </>
                ))}
            </ul>
        )}
    </div>
};

export default RubList;
