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
    <div className="fq-reader-lab relative w-full h-screen overflow-hidden select-none bg-[hsl(var(--rl-void))] text-[hsl(var(--rl-text))]">
      <ReaderLabDesktopGate>
        <ReaderLabNavbar
          initialPage={initialPage}
          gearRef={gearRef}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <main className="fq-reader-lab-stage fixed top-[72px] right-0 bottom-0 left-0 overflow-hidden">
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
