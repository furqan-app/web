"use client";

import { RubWithVerses } from "@/app/types/prisma";
import { SurahResult } from "@types";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@/app/hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useReaderBasePath } from "@hooks/use-reader-base-path";

type Props = {
  rubs: RubWithVerses[];
  surahs: SurahResult[];
};

type JuzGroup = { juzNumber: number; rubs: RubWithVerses[] };

const CIRCUMFERENCE = 2 * Math.PI * 17;

function buildJuzGroups(rubs: RubWithVerses[]): JuzGroup[] {
  const groups: JuzGroup[] = [];
  for (const rub of rubs) {
    const juzNumber = Math.ceil(rub.rub_number / 8);
    const last = groups[groups.length - 1];
    if (!last || last.juzNumber !== juzNumber) {
      groups.push({ juzNumber, rubs: [rub] });
    } else {
      last.rubs.push(rub);
    }
  }
  return groups;
}

const RubList = ({ rubs, surahs }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const basePath = useReaderBasePath();

  const juzGroups = buildJuzGroups(rubs);

  return (
    <div>
      {juzGroups.map(group => (
        <div key={group.juzNumber}>
          <div
            dir="rtl"
            className="sticky top-0 z-10 flex items-center justify-between px-[18px] py-[9px] bg-muted border-y border-border"
          >
            <span className="text-sm font-bold text-primary">
              {t("juz", "Juz")} {toLocaleNumeral(group.juzNumber, locale)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("page", "Page")} {toLocaleNumeral(group.rubs[0].startVerse.page_number, locale)}
            </span>
          </div>

          {group.rubs.map(rub => {
            const posInHizb = (rub.rub_number - 1) % 4;
            const isHizbStart = posInHizb === 0;
            const hizbNumber = Math.ceil(rub.rub_number / 4);
            const filledLen = (posInHizb / 4) * CIRCUMFERENCE;

            const chapterNumber = rub.rubVerseMappings[0]?.chapter_number;
            const surah = surahs.find(s => s.id === chapterNumber);
            const surahName = locale === "ar" ? surah?.name_arabic : surah?.name_simple;
            const ayah = rub.rubVerseMappings[0]?.start_verse;

            const words = rub.startVerse.Word
              .filter(w => w.char_type_name === "word")
              .map(w => w.qpc_uthmani_hafs)
              .join(" ");

            return (
              <Link
                key={rub.id}
                href={`${basePath}/${rub.startVerse.page_number}`}
                locale={locale}
                dir="rtl"
                className="flex items-center gap-3 px-4 py-[13px] border-b border-border bg-background hover:bg-accent transition-colors"
              >
                <div className="shrink-0 w-11 h-11">
                  {isHizbStart ? (
                    <svg width="44" height="44" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="20" style={{ fill: "hsl(var(--primary))" }} />
                      <text
                        x="22"
                        y="28"
                        textAnchor="middle"
                        fontWeight="800"
                        fontSize="16"
                        fontFamily="system-ui, sans-serif"
                        style={{ fill: "hsl(var(--primary-foreground))" }}
                      >
                        {toLocaleNumeral(hizbNumber, locale)}
                      </text>
                    </svg>
                  ) : (
                    <svg width="44" height="44" viewBox="0 0 44 44">
                      <circle
                        cx="22" cy="22" r="17"
                        fill="none"
                        strokeWidth="2"
                        style={{ stroke: "hsl(var(--border))" }}
                      />
                      <circle
                        cx="22" cy="22" r="17"
                        fill="none"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${filledLen.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
                        transform="rotate(-90 22 22)"
                        style={{ stroke: "hsl(var(--primary))" }}
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-right">
                  <p
                    className="font-uthmanic text-[17px] leading-relaxed text-foreground line-clamp-2"
                    dir="rtl"
                  >
                    {words}
                  </p>
                  {surahName && ayah !== undefined && (
                    <p className="flex items-center gap-1.5 mt-[3px] flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-medium text-muted-foreground leading-none">
                        {surahName}
                      </span>
                      <span className="text-xs text-muted-foreground">· {t("verse", "Verse")} {toLocaleNumeral(ayah, locale)}</span>
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-[13px] font-medium text-muted-foreground min-w-[22px]">
                  {toLocaleNumeral(rub.startVerse.page_number, locale)}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default RubList;
