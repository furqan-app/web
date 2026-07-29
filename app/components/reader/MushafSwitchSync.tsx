"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { fetchVersePages } from "@/app/hooks/use-verse-pages";

type Props = {
  /** The page the pager is currently anchored to. */
  anchor: number;
  /** First verse rendered on the current page, in the current edition. */
  firstVerseKey: string | null;
  /** Re-anchor the pager to `page` (also rewrites the URL). */
  onReanchor: (page: number) => void;
};

/**
 * Keeps the reader on the same VERSE when the mushaf edition changes.
 *
 * A page number only means something relative to an edition — 56 verses sit on a
 * different page between the two shipped editions (ADR 0033) — so holding the
 * page number across a switch would silently move the reader to different text.
 * Holding the verse is what a reader actually expects, and it matters most during
 * recitation: if a verse is playing and the edition changes, that verse has to
 * stay on screen for playback to remain coherent (ADR 0021).
 *
 * Null-rendering effect leaf, mirroring RecitationPageSync/ReaderPageSync.
 */
export function MushafSwitchSync({ anchor, firstVerseKey, onReanchor }: Props) {
  const { mushafId } = useQuranMushaf();
  const queryClient = useQueryClient();

  // The edition these refs describe. Only updated by the switch effect below.
  const trackedMushafRef = useRef(mushafId);
  // Latest first-verse seen while the edition was stable.
  const stableVerseRef = useRef<string | null>(firstVerseKey);

  // Declared FIRST so it runs before the switch effect. On the render where the
  // edition changed this sees a stale trackedMushafRef and skips, deliberately
  // leaving stableVerseRef holding the OLD edition's verse — which is the verse
  // to preserve. Without that ordering the new edition's page data can land
  // first, overwrite the ref, and the switch silently becomes a no-op.
  useEffect(() => {
    if (mushafId === trackedMushafRef.current && firstVerseKey) {
      stableVerseRef.current = firstVerseKey;
    }
  }, [firstVerseKey, mushafId]);

  useEffect(() => {
    if (mushafId === trackedMushafRef.current) return;
    trackedMushafRef.current = mushafId;

    const verseKey = stableVerseRef.current;
    if (!verseKey) return;

    let cancelled = false;
    // Resolve against the TARGET edition's map, cached by react-query so a
    // toggle back and forth costs one fetch per edition.
    queryClient
      .fetchQuery({
        queryKey: ["verse-pages", mushafId],
        queryFn: () => fetchVersePages(mushafId),
        staleTime: Infinity,
      })
      .then((versePages) => {
        if (cancelled) return;
        const target = versePages?.[verseKey];
        if (target && target !== anchor) onReanchor(target);
      })
      .catch(() => {
        // Leaving the reader on the same page number is a worse-but-acceptable
        // fallback; never throw out of an edition switch.
      });

    return () => {
      cancelled = true;
    };
    // `anchor`/`onReanchor` are read at fire time; only the edition should
    // trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mushafId, queryClient]);

  return null;
}
