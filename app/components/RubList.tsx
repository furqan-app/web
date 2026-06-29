import { RubWithVerses } from "@/app/types/prisma";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@/app/hooks/use-translations";

type Props = {
    rubs: RubWithVerses[];
};

const RubList = ({ rubs }: Props) => {
    const locale = useLocale();
    const t = useTranslations();

    const getJuzNumber = (rubNumber: number) => {
        return Math.ceil(rubNumber / 8);
    };

    return <div>
        <h2 className="text-lg font-bold">{t('rubs', 'Rubs')}</h2>
        <ul className="space-y-2">
            {rubs.map((rub, index) => (
                <>
                    {index > 0 && getJuzNumber(rub.rub_number) !== getJuzNumber(rubs[index - 1].rub_number) && (
                        <div className="my-4 border-t border-border pt-2">
                            <span className="text-sm text-muted-foreground">{t('juz', 'Juz')} {getJuzNumber(rub.rub_number)}</span>
                        </div>
                    )}
                    <li key={rub.id} className="hover:bg-accent/10 rounded-lg transition-colors">
                        <Link
                            href={`/pages/${rub.startVerse.page_number}`}
                            locale={locale}
                            className="block p-3 text-foreground"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{t('rub', 'Rub')} {rub.rub_number}</span>
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                    {t('page', 'Page')} {rub.startVerse.page_number}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground font-arabic">
                                {rub.startVerse.text_uthmani}
                            </p>
                        </Link>
                    </li>
                </>
            ))}
        </ul>
    </div>
};

export default RubList;
