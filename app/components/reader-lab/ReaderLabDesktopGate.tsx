"use client";

import { type ReactNode } from "react";
import useTranslations from "@/app/hooks/use-translations";

// CSS, not UA detection, chooses the branch: globals.css swaps these two
// containers at min-width 1367px and min-height 800px, so the correct branch is
// already painted on first frame.
export function ReaderLabDesktopGate({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <>
      <div className="fq-reader-lab-gate-notice min-h-screen w-full flex-col items-center justify-center gap-5 p-8 text-center">
        <span className="fq-reader-lab-close-mark" aria-hidden="true" />
        <p className="max-w-sm text-[15px] font-medium leading-relaxed text-[hsl(var(--rl-muted-strong))]">
          {t(
            "readerLab.desktopRequired",
            "تجربة قارئ سطح المكتب — افتحها على شاشة أكبر",
          )}
        </p>
        <span className="fq-reader-lab-close-mark" aria-hidden="true" />
      </div>
      {/* Display for both branches lives entirely in globals.css — no `contents`
          utility here, or it would beat the gate's base rule. */}
      <div className="fq-reader-lab-desktop">{children}</div>
    </>
  );
}
