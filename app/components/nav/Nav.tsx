"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Maximize2, Minimize2, PanelLeftOpen, ChevronDown, ChevronUp } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { ContinueReadingLink } from "./ContinueReadingLink";
import { NavOverflowMenu } from "./NavOverflowMenu";
import { UserMenu } from "./UserMenu";
import { FurqanLogo } from "./FurqanLogo";
import { Button } from "@/components/ui/button";
import { useNavOverlay } from "@/app/contexts/NavOverlayContext";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useIsDesktopUp } from "@/app/hooks/use-is-desktop-up";
import { useIsomorphicLayoutEffect } from "@/app/hooks/use-isomorphic-layout-effect";
import useTranslations from "@hooks/use-translations";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";

export const Nav = () => {
  const { overlayVisible } = useNavOverlay();
  const isDesktopUp = useIsDesktopUp();
  const { open, setOpen, currentSurah, currentJuzHizb } = useSidebar();
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";
  // Trailing slash required — a bare "/pages" substring match false-positives
  // on any route containing that string (e.g. a hypothetical /pages-list).
  const isOnPagesRoute = pathname?.includes("/pages/") ?? false;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setFullscreenEnabled(!!document.fullscreenEnabled);
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <nav
      className={cn(
        // Translucent glass everywhere (Correction Round — desktop included, not
        // just the toggle-hide overlay; matches RecitationPlayerBar exactly so the
        // two bars read as one consistent floating-chrome style, both letting the
        // Mushaf show through underneath).
        "relative z-10 text-foreground px-4 bg-background/75 backdrop-blur-md shadow-[0_8px_30px_-4px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.08)]",
        // Breakpoint half of the overlay switch is CSS-gated (globals.css,
        // .fq-nav-overlay-page) so it's correct on the very first paint — see
        // ADR 0043. Route gating stays here since usePathname() resolves
        // correctly on the first server render too, unlike viewport width.
        isOnPagesRoute && "fq-nav-overlay-page",
        isOnPagesRoute && overlayVisible && "fq-nav-visible",
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Single flat flex row — every item is a direct child, positioned via
          `order` (+ `md:order-*` override), so the two breakpoints can group
          items differently without rendering any component twice:
          - Mobile (<md): logo alone on one side; sidebar toggle, continue
            reading, search, and the overflow menu grouped on the other side.
            One shared `gap-2` on the row gives every adjacent pair in that
            group the same spacing — no per-item margin needed.
          - Desktop/tablet (md+): logo · sidebar toggle · continue reading ·
            spacer · user menu · fullscreen · search · menu — ONE `flex-1`
            spacer pushes everything after it into a single end cluster.
            Search used to sit alone between two spacers (built for the old
            wide inline field); now that it's icon-only, isolating it in its
            own dead-space gap read as broken, so it moved into the same
            tight cluster as fullscreen/menu, mirroring how mobile already
            groups toggle/continue-reading/search/menu together.
          SharedMushafLink/NotificationBell/SettingsSidebar never render
          directly in this row — they live inside NavOverflowMenu's hamburger
          sheet at every breakpoint. UserMenu is the one exception: shown
          directly in the row at md+ (its own dropdown, not menuRow) for
          one-click access to My Marks/My Plans; still inside the menu on
          mobile, where space is tight (docs/plans/home-page-design-fixes.md,
          Addendum — Universal nav menu). */}
      <div className="relative h-14 flex items-center gap-2">
        <FurqanLogo className="order-1 shrink-0" />
        {isOnPagesRoute && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            // fq-nav-tab background — one of only two nav controls that
            // keep one (with the user menu/"my account"); the rest went
            // back to plain icon buttons. A centered surah name, Juz/Hizb
            // below it, on md+.
            // True bar-center, not flex-flow center: the parent row is
            // `relative`, so `md:absolute` + `md:top-1/2 md:left-1/2
            // md:-translate-x-1/2 md:-translate-y-1/2` centers on the bar's
            // own midpoint, sized to its own content (not stretched to the
            // row's full height). Deliberately `left-1/2`, not the logical
            // `start-1/2` — RTL remaps `start` to measure from the right
            // while `-translate-x-1/2` stays physical either way, so pairing
            // a logical inset with a physical transform breaks the
            // symmetry the centering trick depends on (measured ~160px off
            // in RTL, exactly the button's own width). `left`/`translate-x`
            // are both physical, so the pair cancels correctly regardless
            // of direction. Mobile keeps the original compact single-line
            // pill (name + number + chevron), in normal flow, since the
            // two-line layout doesn't fit that width budget.
            className="fq-nav-tab fq-surah-toggle order-3 md:order-2 shrink-0 flex items-center justify-center gap-1.5 h-9 px-2.5 max-w-[8rem] md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 md:h-auto md:max-w-none md:gap-2 md:px-10 md:py-[0.3rem] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {currentSurah ? (
              <>
                {/* Mobile: compact single line */}
                <span className="md:hidden flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {toLocaleNumeral(currentSurah.id, locale)}
                  </span>
                  <span className="text-xs font-medium truncate leading-none">
                    {isRTL ? currentSurah.name_arabic : currentSurah.name_simple}
                  </span>
                  {open ? (
                    <ChevronUp className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                  )}
                </span>
                {/* Desktop: text block (ornament-flanked name over Juz/Hizb)
                    beside the chevron, not stacked under it — the chevron is
                    the LAST child, so it lands on the end side (left in RTL)
                    and `items-center` on this row centers it against the
                    full two-line block's height, not just one line. */}
                <span className="hidden md:flex md:items-center md:gap-2">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs leading-none whitespace-nowrap">
                        {isRTL ? currentSurah.name_arabic : currentSurah.name_simple}
                      </span>
                    </span>
                    {currentJuzHizb && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-foreground/70 whitespace-nowrap">
                        {t("juz", "Juz")} {toLocaleNumeral(currentJuzHizb.juz, locale)}
                        <span className="text-primary" aria-hidden="true">•</span>
                        {t("hizb", "Hizb")} {toLocaleNumeral(currentJuzHizb.hizb, locale)}
                      </span>
                    )}
                  </span>
                  {open ? (
                    <ChevronUp className="size-2.5 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="size-2.5 shrink-0" strokeWidth={2} />
                  )}
                </span>
              </>
            ) : (
              <PanelLeftOpen className={cn("size-5", isRTL && "rotate-180")} strokeWidth={1.7} />
            )}
          </button>
        )}
        <ContinueReadingLink className="order-4 md:order-3 shrink-0" />
        <div className="order-2 md:order-4 flex-1 min-w-0" aria-hidden="true" />
        <div className="hidden md:block md:order-7 shrink-0">
          <UserMenu />
        </div>
        {isDesktopUp && fullscreenEnabled && (
          <Button
            variant="ghost"
            size="icon"
            className="md:order-8 shrink-0"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit focus mode" : "Enter focus mode"}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="size-5" strokeWidth={1.7} />
            ) : (
              <Maximize2 className="size-5" strokeWidth={1.7} />
            )}
          </Button>
        )}
        <div className="order-5 md:order-9 shrink-0">
          <SearchBar />
        </div>
        <NavOverflowMenu className="order-6 md:order-10 shrink-0" />
      </div>
    </nav>
  );
};
