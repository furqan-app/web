"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ReaderLabDesktopGate } from "./ReaderLabDesktopGate";
import { ReaderLabNavbar } from "./ReaderLabNavbar";
import { ReaderLabRecitationRail } from "./ReaderLabRecitationRail";
import { ReaderLabSettingsSidebar } from "./ReaderLabSettingsSidebar";

type ReaderLabShellProps = {
  initialPage: number;
  children: ReactNode;
};

export function ReaderLabShell({ initialPage, children }: ReaderLabShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);

  const restoreGearFocus = useCallback(() => gearRef.current?.focus(), []);

  return (
    // No `h-screen` here: `100vh` goes stale across the installed PWA's
    // fullscreen transition (ADR 0044). The root is `fixed inset-0`, and every
    // band anchors to the ICB the same way.
    <div className="fq-reader-lab fq-reader-lab-root fixed inset-0 overflow-hidden select-none bg-[hsl(var(--rl-void))] text-[hsl(var(--rl-text))]">
      <ReaderLabDesktopGate>
        <ReaderLabNavbar
          initialPage={initialPage}
          gearRef={gearRef}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {/* The navbar's height is a band value (`--rl-navbar-h`), so the stage's
            top offset has to read it rather than hardcode the desk band's 72px. */}
        <main className="fq-reader-lab-stage fixed right-0 bottom-0 left-0 overflow-hidden">
          {children}
        </main>
        <ReaderLabRecitationRail />
        <ReaderLabSettingsSidebar
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onRestoreFocus={restoreGearFocus}
        />
      </ReaderLabDesktopGate>
    </div>
  );
}
