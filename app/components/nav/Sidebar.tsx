"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SurahList } from "../SurahList";
import useTranslations from "@/app/hooks/use-translations";
import RubList from "../RubList";
import { SurahResult } from "@types";
import { RubWithVerses } from "@/app/types/prisma";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { toLocaleNumeral } from "@/app/utils/i18n";

type Props = {
  surahs: SurahResult[];
  rubs: RubWithVerses[];
};

const Sidebar = ({ surahs, rubs }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const { open, setOpen, setCurrentSurah, searchOpen } = useSidebar();
  const { isOverlayMode, overlayVisible } = useNavOverlay();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("surahs");
  const surahsScrollRef = useRef<HTMLDivElement>(null);
  const rubsScrollRef = useRef<HTMLDivElement>(null);

  const pageNumber = parseInt(pathname?.match(/\/pages\/(\d+)/)?.[1] ?? "0", 10);

  const activeSurah =
    surahs.findLast((s) => parseInt(s.pages.split("-")[0], 10) <= pageNumber) ??
    surahs[0] ??
    null;

  const currentRub =
    rubs.findLast((r) => r.startVerse.page_number <= pageNumber) ??
    rubs[0] ??
    null;

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

  const navBottom = "calc(3.5rem + env(safe-area-inset-top, 0px))";

  return (
    <>
      {/* Floating trigger anchored just below the navbar; follows navbar show/hide in overlay mode */}
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        style={{
          top: navBottom,
          ...(searchOpen ? { opacity: 0, pointerEvents: "none" } : {}),
          ...(isOverlayMode ? {
            transform: overlayVisible ? "translateY(0)" : "translateY(calc(-3.5rem - env(safe-area-inset-top, 0px) - 100% - 0.5rem))",
            opacity: overlayVisible ? 1 : 0,
            pointerEvents: overlayVisible ? undefined : "none",
            transition: "transform 300ms cubic-bezier(0.23,1,0.32,1), opacity 300ms cubic-bezier(0.23,1,0.32,1)",
          } : {}),
        }}
        className="fixed start-4 z-[51] mt-2 h-8 gap-1.5 px-2.5 rounded-full shadow-md bg-background/90 backdrop-blur-sm border-border/60 max-w-[9rem]"
      >
        {activeSurah ? (
          <>
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {toLocaleNumeral(activeSurah.id, locale)}
            </span>
            <span className="text-sm font-medium truncate leading-none">
              {isRTL ? activeSurah.name_arabic : activeSurah.name_simple}
            </span>
            {open ? (
              <ChevronUp className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
            ) : (
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">···</span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={isRTL ? "right" : "left"}
        dir={getLanguageDirection(locale)}
        hideDefaultClose
        overlayStyle={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
        style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
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
            className="flex-1 overflow-y-auto p-4 mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <SurahList surahs={surahs} activeSurahId={activeSurah?.id} className="sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-2" />
          </TabsContent>
          <TabsContent
            value="rubs"
            ref={rubsScrollRef}
            className="flex-1 overflow-y-auto mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
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
