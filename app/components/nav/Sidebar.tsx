"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SurahList } from "../SurahList";
import useTranslations from "@/app/hooks/use-translations";
import { useTranslations as useNextIntlTranslations } from "next-intl";
import RubList from "../RubList";
import AyahPicker from "./AyahPicker";
import { SurahResult } from "@types";
import { RubWithVerses } from "@/app/types/prisma";
import { Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocale } from "next-intl";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import { parseNavQuery, rubMatchesQuery, surahMatchesQuery } from "@/app/utils/nav-search";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";

type Props = {
  surahs: SurahResult[];
  rubs: RubWithVerses[];
};

const Sidebar = ({ surahs, rubs }: Props) => {
  const t = useTranslations();
  const tSidebar = useNextIntlTranslations("sidebar");
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const {
    open,
    setOpen,
    setCurrentSurah,
    setCurrentJuzHizb,
    pinnedSurahId,
    setPinnedSurahId,
    setNotifyNavigating,
  } = useSidebar();
  const pathname = usePathname();
  const { notifyNavigating } = useCloseOnBackGesture(open, () => setOpen(false));
  // notifyNavigating is a fresh closure every render (not useCallback'd in the
  // hook) — hold the latest in a ref and publish a stable wrapper into
  // SidebarContext, so SurahListItem always calls the current implementation
  // without this effect re-firing every render (same navRef-style pattern
  // ReaderPager.tsx uses for onArrowNavigate; unstable identity through a
  // context setter caused a real infinite loop once — see
  // docs/plans/fix-reader-nav-infinite-loop.md).
  const notifyNavigatingRef = useRef(notifyNavigating);
  notifyNavigatingRef.current = notifyNavigating;
  const stableNotifyNavigating = useCallback(() => notifyNavigatingRef.current(), []);
  useEffect(() => {
    setNotifyNavigating(stableNotifyNavigating);
    return () => setNotifyNavigating(null);
  }, [stableNotifyNavigating, setNotifyNavigating]);
  const [activeTab, setActiveTab] = useState("surahs");
  // Per-tab filter state lives here, NOT inside TabsContent — Radix unmounts
  // inactive tabs, so an in-tab input would lose its value (and focus) on
  // every switch. Independent queries also let each tab keep its own filter.
  const [surahQuery, setSurahQuery] = useState("");
  const [rubQuery, setRubQuery] = useState("");
  const surahsScrollRef = useRef<HTMLDivElement>(null);
  const rubsScrollRef = useRef<HTMLDivElement>(null);

  // Shared grammar with the home search (nav-search.ts): digit folding,
  // juz/page/hizb/rub prefixes, hamza-folded name matching.
  const parsedSurah = useMemo(() => parseNavQuery(surahQuery), [surahQuery]);
  const parsedRub = useMemo(() => parseNavQuery(rubQuery), [rubQuery]);
  const surahsById = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs]);
  const filteredSurahs = useMemo(
    () => (parsedSurah.text ? surahs.filter((s) => surahMatchesQuery(s, parsedSurah)) : surahs),
    [surahs, parsedSurah],
  );
  const filteredRubs = useMemo(
    () => (parsedRub.text ? rubs.filter((r) => rubMatchesQuery(r, parsedRub, surahsById)) : rubs),
    [rubs, parsedRub, surahsById],
  );
  const activeQuery = activeTab === "surahs" ? surahQuery : rubQuery;
  const setActiveQuery = activeTab === "surahs" ? setSurahQuery : setRubQuery;
  const activeCount = activeTab === "surahs" ? filteredSurahs.length : filteredRubs.length;
  const isFiltering = activeQuery.trim().length > 0;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Clear-first contract: only an empty field lets Escape close the sheet
      // (Radix Dialog closes on Escape by default, even from inside inputs).
      if (activeQuery.trim()) {
        e.preventDefault();
        e.stopPropagation();
        setActiveQuery("");
      }
      return;
    }
    if (e.key !== "Enter") return;
    // Activate the first filtered result via its real link — the link already
    // owns the jumpTo + setOpen(false) handoff, so Enter inherits it for free.
    e.preventDefault();
    const container = activeTab === "surahs" ? surahsScrollRef.current : rubsScrollRef.current;
    container?.querySelector<HTMLAnchorElement>("a[data-surah-id], a[data-rub-id]")?.click();
  };

  const pageNumber = parseInt(pathname?.match(/\/pages\/(\d+)/)?.[1] ?? "0", 10);

  // A page can host more than one surah (e.g. page 604 hosts 112/113/114), so
  // "last surah starting on/before this page" can't tell which one the reader
  // actually navigated to. SurahListItem pins the tapped surah's id; it's
  // trusted only while pageNumber still falls inside that surah's own range —
  // once the reader leaves it (swipe, arrow, another jump), the pin is
  // invalidated below and page-derivation takes back over.
  const pinnedSurah = pinnedSurahId ? (surahs.find((s) => s.id === pinnedSurahId) ?? null) : null;
  const pinnedSurahValid =
    pinnedSurah != null &&
    parseInt(pinnedSurah.pages.split("-")[0], 10) <= pageNumber &&
    pageNumber <= parseInt(pinnedSurah.pages.split("-")[1], 10);

  const activeSurah =
    (pinnedSurahValid ? pinnedSurah : null) ??
    surahs.findLast((s) => parseInt(s.pages.split("-")[0], 10) <= pageNumber) ??
    surahs[0] ??
    null;

  const currentRub =
    rubs.findLast((r) => r.startVerse.page_number <= pageNumber) ??
    rubs[0] ??
    null;

  // Keyed on pageNumber alone, deliberately: the pin is set in the same event
  // handler as jumpTo's history.replaceState, but Next's app router syncs
  // usePathname() to that URL change on a LATER render, not the same one — so
  // right after pinning, this component can still render once with the OLD
  // pageNumber while pinnedSurahId already points at the NEW surah. Keying on
  // [pinnedSurahId, pinnedSurahValid] would re-run on that stale render and
  // clear the pin before pathname ever catches up (pinnedSurahValid reads
  // false against the old page), silently reproducing the bug this pin
  // exists to fix. Keying on pageNumber only defers the validity check to the
  // render where pageNumber has actually changed — either to a page still
  // inside the pinned surah's range (kept) or outside it (cleared).
  useEffect(() => {
    if (pinnedSurahId && !pinnedSurahValid) setPinnedSurahId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  useEffect(() => {
    setCurrentSurah(
      activeSurah
        ? { id: activeSurah.id, name_arabic: activeSurah.name_arabic, name_simple: activeSurah.name_simple }
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSurah?.id]);

  // Juz/Hizb straight from rub_number arithmetic (8 rubs/juz, 4 rubs/hizb —
  // 240 rubs total, no separate juz/hizb columns to query). currentRub is
  // already computed above for the Rub tab; this just republishes it for
  // Nav's surah-selector control.
  useEffect(() => {
    setCurrentJuzHizb(
      currentRub
        ? {
            juz: Math.ceil(currentRub.rub_number / 8),
            hizb: Math.ceil(currentRub.rub_number / 4),
          }
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRub?.rub_number]);

  // Scroll active item into view on open, and again on tab switch while open
  // (`activeTab` is in the deps) — with filters this reveals your position in
  // the tab you just entered, or no-ops harmlessly if it's filtered out.
  const activeTabRef = useRef(activeTab);
  const activeSurahRef = useRef(activeSurah);
  const currentRubRef = useRef(currentRub);
  activeTabRef.current = activeTab;
  activeSurahRef.current = activeSurah;
  currentRubRef.current = currentRub;

  useEffect(() => {
    if (!open) return;
    // rAF lets the Sheet start rendering before we query the DOM
    const frame = requestAnimationFrame(() => {
      const tab = activeTabRef.current;
      const surah = activeSurahRef.current;
      const rub = currentRubRef.current;
      if (tab === "surahs" && surah) {
        surahsScrollRef.current
          ?.querySelector(`[data-surah-id="${surah.id}"]`)
          ?.scrollIntoView({ block: "center", behavior: "instant" });
      } else if (tab === "rubs" && rub) {
        rubsScrollRef.current
          ?.querySelector(`[data-rub-id="${rub.id}"]`)
          ?.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, activeTab]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={isRTL ? "right" : "left"}
        dir={getLanguageDirection(locale)}
        hideDefaultClose
        onEscapeKeyDown={(e) => {
          if (activeTab === "surahs" && surahQuery.trim()) {
            e.preventDefault();
            setSurahQuery("");
          } else if (activeTab === "rubs" && rubQuery.trim()) {
            e.preventDefault();
            setRubQuery("");
          } else if (activeTab === "ayahs") {
            const pickingEl = document.querySelector('[data-ayah-picker-picking="true"]');
            if (pickingEl) {
              e.preventDefault();
              pickingEl.dispatchEvent(new CustomEvent("fq:ayah-picker-escape"));
            }
          }
        }}
        overlayStyle={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
        // top + bottom, never top + height: the height is left to resolve from the
        // initial containing block (ADR 0044). `calc(100dvh - …)` here went stale
        // across the installed PWA's fullscreen transition exactly as the reader's
        // did, making the sheet taller than the screen and clipping its last item —
        // the same symptom docs/plans/fix-sidebar-bottom-clip.md already fixed once
        // for a different reason. `height: auto` is required to defeat the `h-full`
        // in SheetContent's own side variant; with all three of top/height/bottom
        // set the box is over-constrained and the browser drops `bottom`.
        style={{
          top: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          bottom: 0,
          height: "auto",
        }}
        className="w-64 p-0 flex flex-col overflow-hidden"
      >
        <SheetTitle className="sr-only">
          {t("sidebar.title", "Quran navigation")}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {t("sidebar.description", "Browse surahs and rubs to jump to a page.")}
        </SheetDescription>
        <div className="flex justify-end p-4 border-b shrink-0">
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={tSidebar("close")}>
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          dir={getLanguageDirection(locale)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="w-full rounded-none justify-around shrink-0">
            <TabsTrigger value="surahs" className="flex-1">
              {t("surahs", "Surahs")}
            </TabsTrigger>
            <TabsTrigger value="rubs" className="flex-1">
              {t("rubs", "Rubs")}
            </TabsTrigger>
            <TabsTrigger value="ayahs" className="flex-1">
              {tSidebar("tabAyahs")}
            </TabsTrigger>
          </TabsList>
          {/* One adaptive filter field, outside the scroll containers so it
              never scrolls away; semantics follow the active tab. Same visual
              language as the home search field. Hidden on the ayahs tab — the
              picker owns an input (#433). */}
          {activeTab !== "ayahs" && (
          <div className="px-4 pt-2 pb-1 shrink-0">
            <div className="relative flex items-center">
              <Search
                className="size-4 text-muted-foreground absolute start-3 pointer-events-none"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <input
                type="text"
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  activeTab === "surahs"
                    ? tSidebar("filterPlaceholderSurahs")
                    : tSidebar("filterPlaceholderRubs")
                }
                aria-label={
                  activeTab === "surahs"
                    ? tSidebar("filterPlaceholderSurahs")
                    : tSidebar("filterPlaceholderRubs")
                }
                dir={getLanguageDirection(locale)}
                className="fq-focus-ring w-full h-10 rounded-xl border border-border bg-card ps-9 pe-10 text-xs text-foreground placeholder:text-muted-foreground font-tajawal transition-colors duration-150 hover:border-primary/40 focus:border-primary/60 outline-none"
              />
              {isFiltering && (
                <button
                  type="button"
                  onClick={() => setActiveQuery("")}
                  aria-label={tSidebar("filterClear")}
                  className="absolute end-2 size-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))] transition-colors duration-150 fq-focus-ring"
                >
                  <X className="size-4" strokeWidth={1.8} />
                </button>
              )}
            </div>
            {isFiltering && activeCount > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground" role="status">
                {tSidebar("filterResultsCount", {
                  count: activeCount,
                  n: toLocaleNumeral(activeCount, locale),
                })}
              </p>
            )}
          </div>
          )}
          <TabsContent
            value="surahs"
            ref={surahsScrollRef}
            className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {parsedSurah.text && filteredSurahs.length === 0 ? (
              <FilterEmptyState
                message={tSidebar("filterNoMatches")}
                range={tSidebar("filterRangeSurahs")}
              />
            ) : (
              <SurahList surahs={filteredSurahs} activeSurahId={activeSurah?.id} className="sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-2" />
            )}
          </TabsContent>
          <TabsContent
            value="rubs"
            ref={rubsScrollRef}
            className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {parsedRub.text && filteredRubs.length === 0 ? (
              <FilterEmptyState
                message={tSidebar("filterNoMatches")}
                range={tSidebar("filterRangeRubs")}
              />
            ) : (
              <RubList rubs={rubs} filteredRubs={parsedRub.text ? filteredRubs : undefined} surahs={surahs} currentRubId={currentRub?.id} />
            )}
          </TabsContent>
          <TabsContent
            value="ayahs"
            className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {activeSurah ? (
              <AyahPicker surah={activeSurah} surahs={surahs} currentPage={pageNumber} />
            ) : null}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
    </>
  );
};

// Sheet-scale empty state (halved padding vs the home page's full-screen
// variant): icon + one-line message + the valid ranges for this tab.
const FilterEmptyState = ({ message, range }: { message: string; range: string }) => (
  <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
    <span className="fq-well grid size-10 place-items-center rounded-xl text-muted-foreground">
      <SearchX className="size-5" strokeWidth={1.6} />
    </span>
    <p className="text-sm font-medium text-foreground">{message}</p>
    <p className="text-xs text-muted-foreground">{range}</p>
  </div>
);

export default Sidebar;
