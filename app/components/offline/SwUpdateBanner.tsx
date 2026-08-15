"use client";

import { useState } from "react";
import useTranslations from "@hooks/use-translations";
import { useSwUpdate } from "@hooks/use-sw-update";
import { Button } from "@/components/ui/button";

/**
 * Surfaces a service-worker update that has already taken control silently in
 * the background (ADR 0014 Addendum 4) — prompts a reload rather than forcing
 * one, since a silent reload mid-reading would drop the user's scroll
 * position. In-flow, mounted directly before <Nav /> (app/[locale]/layout.tsx)
 * so it pushes the nav down rather than overlaying it — `fixed` was tried
 * first and painted over Nav's `relative z-10` bar (Nav.tsx:56), silently
 * blocking every nav control while a banner was showing (found in review).
 */
export const SwUpdateBanner = () => {
  const t = useTranslations();
  const { updateAvailable, reload } = useSwUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 bg-card border-b p-2 text-sm"
    >
      <span>{t("swUpdate.title", "New version available")}</span>
      <Button size="sm" onClick={reload}>
        {t("swUpdate.refresh", "Refresh")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        {t("swUpdate.dismiss", "Later")}
      </Button>
    </div>
  );
};
