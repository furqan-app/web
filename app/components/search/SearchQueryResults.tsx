import { highlight } from "@utils/highlight";
import Link from "next/link";
import { SurahResult, VerseResult } from "@types";
import useTranslations from "@hooks/use-translations";
import { useLocale } from "next-intl";

export default function SearchQueryResults({ chapters, verses, setIsOpen }: { chapters: SurahResult[], verses: VerseResult[], setIsOpen: (isOpen: boolean) => void }) {
    const t = useTranslations();
    const locale = useLocale();

    return <div className="absolute w-full mt-2 bg-popover rounded-lg shadow-lg
    border border-border max-h-96 overflow-auto z-50">
        {chapters && chapters.length > 0 && (
            <div className="border-b border-border">
                <div className="px-4 py-2 bg-muted">
                    <span className="font-medium text-foreground">
                        {t('surahs', 'Surahs')} ({chapters.length})
                    </span>
                </div>
                {chapters.map((chapter) => (
                    <Link
                        locale={locale}
                        key={chapter.id}
                        href={`/pages/${chapter.pages.split('-')[0]}`}
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 hover:bg-accent"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                                {chapter.name_simple}
                            </span>
                            <span className="font-surahnames text-xl">
                                {chapter.name_arabic}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        )}

        {verses && verses.length > 0 && (
            <div>
                <div className="px-4 py-2 bg-muted">
                    <span className="font-medium text-foreground">
                        {t('verses', 'Verses')} ({verses.length})
                    </span>
                </div>
                {verses.map((verse) => (
                    <Link
                        locale={locale}
                        key={verse.verse_key}
                        href={highlight.addToUrl({ verseKey: verse.verse_key, pageNumber: verse.page_number })}
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 hover:bg-accent"
                    >
                        <div className="text-sm text-muted-foreground">
                            {locale === 'ar' ? verse.chapter.name_arabic : verse.chapter.name_simple} - {verse.verse_key.split(':')[1]}
                        </div>
                        <div className="text-right font-uthmanic text-lg" dir="rtl">
                            {verse.Word.map(w => w.qpc_uthmani_hafs).join(' ')}
                        </div>
                    </Link>
                ))}
            </div>
        )}
    </div>;
}
