"use client";

import { useEffect, useState } from "react";
import useTranslations from "@hooks/use-translations";
import { cn } from "@/lib/utils";

type Props = { show: boolean };

// Transient, not dismissible — it hides itself when AndroidBackExitGuard's
// timer disarms or the app exits. `mounted` drives a one-frame-delayed enter
// transition (no @starting-style support required); unmounts immediately on
// hide rather than animating out, since by the time `show` flips to false the
// user has already moved on (timer expiry) or the app is closing (exit).
export const ExitToast = ({ show }: Props) => {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!show) {
      setMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-24 inset-x-4 z-50 mx-auto w-fit max-w-xs rounded-xl border bg-card px-4 py-2.5 text-center text-sm font-medium text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] transition-all duration-200 motion-reduce:translate-y-0",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
    >
      {t("exitApp.pressBackAgain", "Press back again to exit")}
    </div>
  );
};
