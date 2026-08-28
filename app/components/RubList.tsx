"use client";

import { RubWithVerses } from "@/app/types/prisma";
import { SurahResult } from "@types";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import useTranslations from "@/app/hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useReaderBasePath } from "@hooks/use-reader-base-path";
import { useVersePages } from "@hooks/use-verse-pages";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { cn } from "@/lib/utils";

type Props = {
  rubs: RubWithVerses[];
  surahs: SurahResult[];
  currentRubId?: number;
  // Sidebar filter (#362): when set, rows/groups come from this subset while
  // juz header pages still resolve from the FULL `rubs` prop — a filtered
  // header must never show "page of first match" as the juz's start.
  filteredRubs?: RubWithVerses[];
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

const RubList = ({ rubs, surahs, currentRubId, filteredRubs }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const basePath = useReaderBasePath();
  const { data: versePages } = useVersePages();
  const { setOpen } = useSidebar();
  const { jumpTo } = useReaderNavigation();

  // A rub starts at a verse, and which page that verse sits on depends on the
  // mushaf edition — 56 verses land on a different page between editions, so a
  // hardcoded page number would send the reader to the wrong page in one of them
  // (ADR 0033). Falls back to the default edition's page until the map loads.
  const pageOfVerse = (startVerse: { verse_key: string; page_number: number }) =>
    versePages?.[startVerse.verse_key] ?? startVerse.page_number;

  const shownRubs = filteredRubs ?? rubs;
  const juzGroups = buildJuzGroups(shownRubs);

  // True juz-start rub from the FULL list, keyed for header lookup — a filtered
  // group's first row is not the juz boundary.
  const juzStartRub = (juzNumber: number): RubWithVerses | undefined =>
    rubs.find((r) => r.rub_number === (juzNumber - 1) * 8 + 1);

  return (
    <div>
      {juzGroups.map(group => (
        <div key={group.juzNumber}>
          <div
            dir="rtl"
            className="fq-section-heading flex items-center justify-between px-[18px] py-[9px] !rounded-none"
          >
            {/* Which juz you are in is identity — where you are — so it takes
                the warm accent, not the state one. */}
            <span className="text-[11px] font-semibold tracking-[0.14em] text-primary">
              {t("juz", "Juz")} {toLocaleNumeral(group.juzNumber, locale)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("page", "Page")} {toLocaleNumeral(pageOfVerse((juzStartRub(group.juzNumber) ?? group.rubs[0]).startVerse), locale)}
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
                href={`${basePath}/${pageOfVerse(rub.startVerse)}`}
                locale={locale}
                dir="rtl"
                data-rub-id={rub.id}
                onClick={(e) => {
                  setOpen(false);
                  // Same client-side handoff as SurahListItem — see there.
                  if (!jumpTo || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  jumpTo(pageOfVerse(rub.startVerse));
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-[13px] border-b border-border transition-colors",
                  rub.id === currentRubId
                    ? "bg-primary/10"
                    : "bg-background hover:bg-[hsl(var(--well)/var(--well-alpha))]",
                )}
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
                  {toLocaleNumeral(pageOfVerse(rub.startVerse), locale)}
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
