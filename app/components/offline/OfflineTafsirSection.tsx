"use client";

import { useEffect, useState } from "react";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { OfflineTafsirSheet } from "@components/offline/OfflineTafsirSheet";

/**
 * Settings row opening the Offline Tafsir download sheet (ADR 0060).
 * Standalone-PWA-only, same gate as OfflineRecitationSection — no browser-tab
 * path.
 */
export const OfflineTafsirSection = () => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  if (!isStandalone) return null;

  return <OfflineTafsirSheet />;
};
