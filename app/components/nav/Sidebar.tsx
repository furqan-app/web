"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SurahList } from "../SurahList";
import useTranslations from "@/app/hooks/use-translations";
import RubList from "../RubList";
import { SurahResult } from "@types";
import { RubWithVerses } from "@/app/types/prisma";
import { X } from "lucide-react";
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
import { getLanguageDirection } from "@/app/utils/i18n";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";

type Props = {
  surahs: SurahResult[];
  rubs: RubWithVerses[];
};

const Sidebar = ({ surahs, rubs }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const {
    open,
    setOpen,
    setCurrentSurah,
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
  const surahsScrollRef = useRef<HTMLDivElement>(null);
  const rubsScrollRef = useRef<HTMLDivElement>(null);

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

  // Scroll active item into view when sidebar opens. Only fires on open transitions,
  // not on tab switches — the user is free to browse other items without being snapped back.
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
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
          </TabsList>
          <TabsContent
            value="surahs"
            ref={surahsScrollRef}
            className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <SurahList surahs={surahs} activeSurahId={activeSurah?.id} className="sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-2" />
          </TabsContent>
          <TabsContent
            value="rubs"
            ref={rubsScrollRef}
            className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <RubList rubs={rubs} surahs={surahs} currentRubId={currentRub?.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
    </>
  );
};

export default Sidebar;
