"use client";

import { useEffect, useRef } from "react";
import { useTafsirModal } from "@/app/contexts/TafsirContext";
import { useReaderPage } from "@/app/contexts/ReaderPageContext";
import { useReaderNavigation } from "@/app/contexts/ReaderNavigationContext";
import { useVersePages } from "@/app/hooks/use-verse-pages";

/**
 * Null-rendering synchronization leaf mirroring LastReadPageSync and RecitationFollow:
 * Keeps the mounted reader pager aligned with the active Tafsir verse key during manual
 * verse stepping across page boundaries, using the active mushaf edition's verse mapping.
 *
 * Invariants:
 * - Uses `jumpTo(page)` from ReaderNavigationContext (ADR 0028) — never router.push.
 * - Resolves verse -> page through `useVersePages()` (ADR 0033).
 * - Avoids calling `jumpTo` if the target page is already visible (e.g. facing page of double spread).
 * - Remains independent from recitation playback (recitation auto-advance does not mutate verseKey).
 */
export function TafsirReaderSync() {
  const { isOpen, verseKey } = useTafsirModal();
  const { visiblePages } = useReaderPage();
  const { jumpTo } = useReaderNavigation();
  const { data: versePages } = useVersePages(isOpen);
  const lastSyncedKey = useRef<string | null>(null);

  const visiblePagesRef = useRef(visiblePages);
  visiblePagesRef.current = visiblePages;
  const visiblePagesKey = visiblePages ? visiblePages.join(",") : "";

  useEffect(() => {
    if (!isOpen) {
      lastSyncedKey.current = null;
      return;
    }

    const currentPages = visiblePagesRef.current;
    if (!verseKey || !jumpTo || !currentPages || !versePages) {
      return;
    }

    // Only synchronize when verseKey changes to a new value
    if (lastSyncedKey.current === verseKey) {
      return;
    }

    const targetPage = versePages[verseKey];
    if (typeof targetPage === "number" && targetPage >= 1) {
      lastSyncedKey.current = verseKey;
      if (!currentPages.includes(targetPage)) {
        jumpTo(targetPage);
      }
    }
  }, [isOpen, verseKey, jumpTo, visiblePagesKey, versePages]);

  return null;
}
