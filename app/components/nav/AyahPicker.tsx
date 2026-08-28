"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { SurahResult } from "@types";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useVersePages } from "@hooks/use-verse-pages";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import {
  NAV_SEARCH,
  parseAyahNumber,
  parseNavQuery,
  surahMatchesQuery,
} from "@utils/nav-search";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  // The surah the reader is currently in (Sidebar's activeSurah — pin-aware);
  // the picker's DEFAULT target. All 114 are passed so the inline list can
  // retarget (#433).
  surah: SurahResult;
  surahs: SurahResult[];
  currentPage: number;
};

// Third sidebar tab (#433): pick a surah (defaults to current), then an ayah by
// number or chip, or type any page number 1–604. The surah list swaps inline
// into the tab body (Option A) rather than a popover — no portals, no
// focus-trap container plumbing inside the Sheet. Landing reuses jumpTo for
// the instant pager swap; the highlight is then stamped onto the URL with
// history.replaceState AFTER jumpTo (jumpTo writes a bare path, so it must go
// first) — Next ≥14.1 syncs replaceState searchParams into QuranWord's
// useSearchParams, coloring the verse without new prop plumbing. The next page
// turn replaces the URL bare again, clearing the highlight naturally.
const AyahPicker = ({ surah, surahs, currentPage }: Props) => {
  const tSidebar = useNextIntlTranslations("sidebar");
  const locale = useLocale();
  const { setOpen } = useSidebar();
  const { jumpTo } = useReaderNavigation();
  const { data: versePages } = useVersePages();
  // verse_key → page map is SW-precached; until it lands there is no honest
  // page to promise any ayah, so chips stay inert instead of guessing. The
  // page field is unaffected — a page number needs no map to be an address.
  const ready = !!versePages;

  // Radix unmounts inactive TabsContent, so this useState initializer re-runs
  // on every tab/sheet open — the target always starts at the CURRENT surah,
  // and only a deliberate list pick moves it (stays put across page turns
  // while the sheet stays open).
  const [target, setTarget] = useState(surah);
  const [picking, setPicking] = useState(false);
  const [listQuery, setListQuery] = useState("");

  // Shared grammar with tab 1's filter: hamza-folded names AND bare surah
  // numbers ("18" finds الكهف).
  const parsedList = useMemo(() => parseNavQuery(listQuery), [listQuery]);
  const filteredList = useMemo(
    () =>
      parsedList.text
        ? surahs.filter((s) => surahMatchesQuery(s, parsedList))
        : surahs,
    [surahs, parsedList],
  );

  const [raw, setRaw] = useState("");
  const n = useMemo(() => parseAyahNumber(raw), [raw]);
  const outOfRange = n !== null && (n < 1 || n > target.verses_count);

  const [pageRaw, setPageRaw] = useState("");
  const pageN = useMemo(() => parseAyahNumber(pageRaw), [pageRaw]);
  const pageOutOfRange =
    pageN !== null && (pageN < 1 || pageN > NAV_SEARCH.lastPage);

  const pageOfAyah = (ayah: number) => versePages?.[`${target.id}:${ayah}`];

  const jumpToAyah = (ayah: number) => {
    if (!ready || !jumpTo) return;
    if (ayah < 1 || ayah > target.verses_count) return;
    const page = pageOfAyah(ayah);
    if (!page) return;
    jumpTo(page);
    const url = new URL(window.location.href);
    url.searchParams.set("highlight", `${target.id}:${ayah}`);
    url.searchParams.set("highlight-type", "search");
    window.history.replaceState(null, "", url.toString());
    setOpen(false);
  };

  const jumpToPage = () => {
    if (!jumpTo) return;
    if (pageN === null || pageOutOfRange) return;
    jumpTo(pageN);
    setOpen(false);
  };

  const pickTarget = (s: SurahResult) => {
    setTarget(s);
    setPicking(false);
    setListQuery("");
    setRaw("");
  };

  // Shared clear-first Escape contract with the #362 filter field: a non-empty
  // input clears itself before letting Radix close the sheet.
  const makeKeyDown =
    (value: string, clear: () => void, submit: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (value.trim()) {
          e.preventDefault();
          e.stopPropagation();
          clear();
        }
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      submit();
    };

  const countText = tSidebar("ayahCount", {
    count: target.verses_count,
    n: toLocaleNumeral(target.verses_count, locale),
  });

  return (
    <div className="px-4 py-3">
      {/* Target selector — tapping swaps the body to the searchable surah list */}
      <button
        type="button"
        onClick={() => setPicking((p) => !p)}
        aria-expanded={picking}
        className="fq-focus-ring w-full flex items-center justify-between gap-2 rounded-xl px-1 py-1 text-start hover:bg-[hsl(var(--well)/var(--well-alpha))] transition-colors duration-150"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate" dir="auto">
            {locale === "ar" ? target.name_arabic : target.name_simple}
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          <span className="text-xs whitespace-nowrap">{countText}</span>
          <ChevronDown
            className={cn("size-4 transition-transform duration-150", picking && "rotate-180")}
            strokeWidth={1.8}
          />
        </span>
      </button>

      {picking ? (
        <div className="mt-2.5">
          <input
            type="text"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            onKeyDown={makeKeyDown(listQuery, () => setListQuery(""), () => {
              if (filteredList.length > 0) pickTarget(filteredList[0]);
            })}
            placeholder={tSidebar("ayahPickSurah")}
            aria-label={tSidebar("ayahPickSurah")}
            dir={locale === "ar" ? "rtl" : "ltr" }
            className={cn(
              "fq-focus-ring w-full h-10 rounded-xl border bg-card px-4 text-sm text-foreground",
              "placeholder:text-muted-foreground transition-colors duration-150 outline-none",
              "border-border hover:border-primary/40 focus:border-primary/60",
            )}
          />
          {filteredList.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground text-center" role="status">
              {tSidebar("filterNoMatches")}
            </p>
          )           : (
            <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-border divide-y divide-border/70 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {filteredList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickTarget(s)}
                  className={cn(
                    "fq-focus-ring-inset w-full flex items-center gap-2.5 px-3 py-2 text-start",
                    "hover:bg-[hsl(var(--well)/var(--well-alpha))] transition-colors duration-150",
                  )}
                >
                  <span className="text-sm truncate flex-1" dir="auto">
                    {locale === "ar" ? s.name_arabic : s.name_simple}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {toLocaleNumeral(s.verses_count, locale)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="relative mt-2.5">
            <input
              type="text"
              inputMode="numeric"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={makeKeyDown(raw, () => setRaw(""), () => {
                if (n !== null && !outOfRange) jumpToAyah(n);
              })}
              placeholder={tSidebar("ayahInputPlaceholder")}
              aria-label={tSidebar("ayahInputPlaceholder")}
              dir={locale === "ar" ? "rtl" : "ltr" }
              className={cn(
                "fq-focus-ring w-full h-10 rounded-xl border bg-card px-4 text-sm text-foreground",
                "placeholder:text-muted-foreground transition-colors duration-150 outline-none",
                outOfRange
                  ? "border-destructive/60"
                  : "border-border hover:border-primary/40 focus:border-primary/60",
              )}
            />
          </div>
          {outOfRange && (
            <p className="mt-1.5 text-xs text-destructive" role="status">
              {tSidebar("ayahRangeHint", {
                max: toLocaleNumeral(target.verses_count, locale),
              })}
            </p>
          )}

          <div className="mt-2">
            <input
              type="text"
              inputMode="numeric"
              value={pageRaw}
              onChange={(e) => setPageRaw(e.target.value)}
              onKeyDown={makeKeyDown(pageRaw, () => setPageRaw(""), jumpToPage)}
              placeholder={tSidebar("ayahPagePlaceholder")}
              aria-label={tSidebar("ayahPagePlaceholder")}
              dir={locale === "ar" ? "rtl" : "ltr" }
              className={cn(
                "fq-focus-ring w-full h-10 rounded-xl border bg-card px-4 text-sm text-foreground",
                "placeholder:text-muted-foreground transition-colors duration-150 outline-none",
                pageOutOfRange
                  ? "border-destructive/60"
                  : "border-border hover:border-primary/40 focus:border-primary/60",
              )}
            />
            {pageOutOfRange && (
              <p className="mt-1.5 text-xs text-destructive" role="status">
                {tSidebar("ayahRangeHint", {
                  max: toLocaleNumeral(NAV_SEARCH.lastPage, locale),
                })}
              </p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border/70" />

          <div
            className="grid grid-cols-6 gap-1.5"
            role="group"
            aria-label={tSidebar("tabAyahs")}
          >
            {Array.from({ length: target.verses_count }, (_, i) => {
              const ayah = i + 1;
              const page = ready ? pageOfAyah(ayah) : undefined;
              const here = ready && page === currentPage;
              return (
                <button
                  key={ayah}
                  type="button"
                  aria-label={tSidebar("ayahChipLabel", {
                    n: toLocaleNumeral(ayah, locale),
                  })}
                  disabled={!ready}
                  onClick={() => jumpToAyah(ayah)}
                  className={cn(
                    "fq-focus-ring h-9 rounded-md text-sm tabular-nums border transition-colors duration-150",
                    "disabled:opacity-40 disabled:pointer-events-none",
                    here
                      ? "border-primary/50 bg-[hsl(var(--primary)/0.08)] text-primary font-medium"
                      : "border-border bg-card hover:bg-[hsl(var(--well)/var(--well-alpha))] hover:border-primary/30 text-foreground",
                  )}
                >
                  {toLocaleNumeral(ayah, locale)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AyahPicker;
