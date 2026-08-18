"use client";

import { useEffect, useState } from "react";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { OfflineRecitationSheet } from "@components/offline/OfflineRecitationSheet";

/**
 * Settings row opening the Offline Recitation download sheet (ADR 0046).
 * Standalone-PWA-only, same gate as OfflineAccessSection — no browser-tab
 * path, per the confirmed scope decision.
 */
export const OfflineRecitationSection = () => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  if (!isStandalone) return null;

  return <OfflineRecitationSheet />;
};
