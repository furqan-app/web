"use client";

import { type ReactNode } from "react";
import useTranslations from "@/app/hooks/use-translations";

// The lab used to be desktop-only: below 1367×800 it showed a notice, which is
// a guard, not a design. It now composes in three bands (compact, spread, desk)
// and the notice survives only below a true minimum — a viewport so short that
// a 15-line mushaf page cannot render at all, where there is nothing to design.
//
// CSS, not UA detection, chooses the branch, so the correct one is painted on
// the first frame (ADR 0013 Addendum 4, ADR 0043).
export function ReaderLabDesktopGate({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <>
      <div className="fq-reader-lab-gate-notice absolute inset-0 w-full flex-col items-center justify-center gap-5 p-8 text-center">
        <span className="fq-reader-lab-close-mark" aria-hidden="true" />
        <p className="max-w-sm text-[15px] font-medium leading-relaxed text-[hsl(var(--rl-muted-strong))]">
          {t(
            "readerLab.viewportTooShort",
            "الشاشة قصيرة جداً لعرض صفحة المصحف — أدر الجهاز أو كبّر النافذة",
          )}
        </p>
        <span className="fq-reader-lab-close-mark" aria-hidden="true" />
      </div>
      {/* Display for both branches lives entirely in globals.css — no `contents`
          utility here, or it would beat the gate's base rule. */}
      <div className="fq-reader-lab-canvas">{children}</div>
    </>
  );
}
