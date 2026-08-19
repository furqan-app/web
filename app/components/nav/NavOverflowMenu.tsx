"use client";

import { useState } from "react";
import { Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import useTranslations from "@hooks/use-translations";
import { SharedMushafLink } from "./SharedMushafLink";
import { NotificationBell } from "@components/notifications/NotificationBell";
import { UserMenu } from "./UserMenu";
import { SettingsSidebar } from "../SettingsSidebar";
import { menuRowClassName } from "./NavPillLink";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";

type Props = {
  className?: string;
};

/**
 * Universal overflow trigger — collapses SharedMushafLink, NotificationBell,
 * UserMenu, and SettingsSidebar into one full-width bottom sheet at every
 * breakpoint, keeping search + ContinueReadingLink + the sidebar toggle
 * directly tappable in the nav row (docs/plans/home-page-design-fixes.md,
 * Addendum — Universal nav menu; shipped mobile-only in the base plan).
 * Rebuilt from an earlier Popover version that read as "four components
 * pasted together" — critiqued and rejected (2026-08-13,
 * docs/plans/home-page-design-fixes.md, .impeccable critique
 * 2026-08-13T13-56-56Z). Every item renders through `menuRowClassName`
 * (NavPillLink.tsx) so the menu reads as one surface, not four different
 * trigger styles.
 *
 * NotificationBell's Popover and UserMenu's DropdownMenu both nest inside
 * this Sheet's modal FocusScope, so both take `container` pointed at the
 * SheetContent's own DOM node (captured via `setSheetContentEl`) — same
 * pattern as RecitationSettingsSheet's nested Popover, see
 * DECISIONS.md's UI Component Library entry and PopoverContent's/
 * DropdownMenuContent's own comments.
 *
 * SettingsSidebar is deliberately NOT nested inside this SheetContent (a
 * second attempt was — clicking its trigger closed this menu but then
 * failed to open Settings at all: closing this Sheet unmounts everything
 * inside it, including a nested Sheet that was told to open on that exact
 * same click, wiping its state before it could render). Instead, the
 * Settings row here is a plain button that (1) closes this menu and (2)
 * flips `settingsOpen`, which drives a `<SettingsSidebar>` instance
 * rendered as this component's own sibling, outside the closing tree
 * entirely — so it survives this menu closing under it.
 *
 * This Sheet's own open state is controlled (not Radix's default
 * uncontrolled), because Nav lives in the locale layout and never remounts
 * across in-app navigation (DECISIONS.md, "Nav-Mounted State Must Be
 * Live") — an uncontrolled Sheet would stay open after SharedMushafLink
 * navigates away. `closeMenu` is passed to it for the same reason.
 */
export const NavOverflowMenu = ({ className }: Props = {}) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);
  const closeMenu = () => setOpen(false);
  const { notifyNavigating } = useCloseOnBackGesture(open, closeMenu);
  // Rows that navigate via a `<Link>` (SharedMushafLink, UserMenu's My
  // Marks/My Plans) must use this instead of `closeMenu` directly — see
  // ADR 0043's 2026-08-16 addendum for why the guard can't infer "closed
  // because of a navigation" from timing alone.
  const closeMenuAndNotify = () => {
    notifyNavigating();
    closeMenu();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("nav.more", "More")}
            className={className}
          >
            <Menu className="size-5" strokeWidth={1.7} />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" ref={setSheetContentEl} className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="sr-only">{t("nav.more", "More")}</SheetTitle>
            <SheetDescription className="sr-only">{t("nav.more", "More")}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom,0px)]">
            <SharedMushafLink menuRow onNavigate={closeMenuAndNotify} />
            <NotificationBell menuRow container={sheetContentEl} />
            {/* md+ has a direct Account dropdown in Nav's row (one-click
                access to My Marks/My Plans) — this row would be redundant
                there. Mobile keeps it, where nav space is tight. */}
            <div className="md:hidden">
              <UserMenu menuRow container={sheetContentEl} onNavigate={closeMenuAndNotify} />
            </div>
            <button
              aria-label={t("settings", "Settings")}
              className={menuRowClassName}
              onClick={() => {
                closeMenu();
                setSettingsOpen(true);
              }}
            >
              <Settings className="size-5 flex-none" strokeWidth={1.7} />
              <span>{t("settings", "Settings")}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <SettingsSidebar open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};
