"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  TafsirDownloadState,
  deleteEdition,
  downloadEdition,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/app/lib/tafsir/download-manager";
import { TafsirEdition } from "@/app/types/tafsir";

/**
 * Full read/write binding for the Offline Tafsir Settings sheet. All state lives
 * in the module singleton (`download-manager.ts`) so a download in flight keeps
 * its progress and cannot be double-started across the sheet unmounting.
 */
export const useTafsirDownload = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const getEditionState = useCallback(
    (editionId: number): TafsirDownloadState => {
      // An explicit runtime state (downloading / failed / quota-exceeded) always
      // wins; otherwise a registry entry reads as downloaded. `verifyAndHeal`
      // demotes an entry whose cache iOS has evicted to an explicit "failed", so
      // this never shows a phantom "downloaded" for longer than the check takes.
      const explicit = snapshot.editionStates[editionId];
      if (explicit) return explicit;
      return snapshot.downloads.some((d) => d.editionId === editionId)
        ? "downloaded"
        : "idle";
    },
    [snapshot],
  );

  const getProgress = useCallback(
    (editionId: number) => snapshot.editionProgress[editionId] ?? 0,
    [snapshot],
  );

  return {
    downloads: snapshot.downloads,
    downloadEdition: useCallback(
      (edition: TafsirEdition) => downloadEdition(edition),
      [],
    ),
    deleteEdition: useCallback((editionId: number) => deleteEdition(editionId), []),
    getEditionState,
    getProgress,
  };
};

/**
 * Read-only accessor for the `TafsirEditionSelect` badge — reflects only
 * editions whose full 114-surah cache is verified intact.
 */
export const useTafsirDownloads = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    isDownloaded: useCallback(
      (editionId: number) => snapshot.verifiedIds.includes(editionId),
      [snapshot],
    ),
  };
};
