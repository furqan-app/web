"use client";

import { useCallback, useEffect, useState } from "react";
import { storage } from "@/app/utils/storage";
import { fetchJuzBounds } from "@/app/utils/recitation-api";
import {
  PAGES_CACHE_NAME,
  PRECACHE_SENTINEL_URL,
  RECITATION_DOWNLOAD_CACHE_NAME,
  VERSE_PAGES_URL,
  pageFontUrl,
  pageJsonUrl,
} from "@constants/offline";
import { ChapterAudio, RecitationDownloadItem } from "@/app/types/recitation";
import { SurahResult } from "@/app/types";

export type DownloadKind = "surah" | "juz";
export type DownloadItemState = "idle" | "downloading" | "downloaded" | "failed";

const itemId = (kind: DownloadKind, key: number, reciterId: number) =>
  `${kind}:${reciterId}:${key}`;

const parsePageRange = (pages: string): number[] => {
  const [start, end] = pages.split("-").map(Number);
  const ids: number[] = [];
  for (let p = start; p <= end; p++) ids.push(p);
  return ids;
};

/** Fetch+cache a byte response (audio, fonts, page JSON). Skips the network if already cached. */
async function ensureCachedBytes(cache: Cache, url: string): Promise<number> {
  const existing = await cache.match(url);
  if (existing) return (await existing.blob()).size;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  await cache.put(url, response.clone());
  return (await response.blob()).size;
}

/** Fetch+cache a jsonResponse()-enveloped route, returning its unwrapped `data`. */
async function fetchAndCacheJson<T>(cache: Cache, url: string): Promise<{ data: T; sizeBytes: number }> {
  const existing = await cache.match(url);
  if (existing) {
    const sizeBytes = (await existing.clone().blob()).size;
    const body = (await existing.json()) as { data: T | null; success: boolean; message: string | null };
    if (!body.success || body.data == null) throw new Error(body.message ?? "Request failed");
    return { data: body.data, sizeBytes };
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  // jsonResponse() (app/api/response.ts) always returns HTTP 200 regardless of
  // its `code` field — response.ok can't tell a real success from a logical
  // 404/422/502 envelope, so the envelope's own `success` flag must be
  // checked BEFORE caching. Caching first would let a genuine failure (e.g.
  // no audio for this reciter+chapter) get served back on every retry.
  const body = (await response.clone().json()) as { data: T | null; success: boolean; message: string | null };
  if (!body.success || body.data == null) throw new Error(body.message ?? "Request failed");

  await cache.put(url, response.clone());
  const sizeBytes = (await response.blob()).size;
  return { data: body.data, sizeBytes };
}

type DownloadedChapter = {
  chapterId: number;
  audioUrl: string;
  verseTimings: ChapterAudio["verseTimings"];
  pages: number[];
  sizeBytes: number;
};

/** Downloads one chapter's audio+metadata+reader pages — shared by surah and juz downloads. */
async function downloadChapter(
  downloadCache: Cache,
  pagesCache: Cache,
  reciterId: number,
  surah: SurahResult,
): Promise<DownloadedChapter> {
  const { data: chapterAudio, sizeBytes: metaBytes } = await fetchAndCacheJson<ChapterAudio>(
    downloadCache,
    `/api/quran/recitations/${reciterId}/chapters/${surah.id}`,
  );

  const audioBytes = await ensureCachedBytes(downloadCache, chapterAudio.audioUrl);

  const pages = parsePageRange(surah.pages);
  const pageByteSizes = await Promise.all(
    pages.flatMap((p) => [
      ensureCachedBytes(pagesCache, pageJsonUrl(p)),
      ensureCachedBytes(pagesCache, pageFontUrl(p)),
    ]),
  );

  return {
    chapterId: surah.id,
    audioUrl: chapterAudio.audioUrl,
    verseTimings: chapterAudio.verseTimings,
    pages,
    sizeBytes: metaBytes + audioBytes + pageByteSizes.reduce((a, b) => a + b, 0),
  };
}

async function performDownloadSurah(
  surah: SurahResult,
  reciterId: number,
  reciterLabel: string,
): Promise<RecitationDownloadItem> {
  const downloadCache = await caches.open(RECITATION_DOWNLOAD_CACHE_NAME);
  const pagesCache = await caches.open(PAGES_CACHE_NAME);
  const versePagesBytes = await ensureCachedBytes(pagesCache, VERSE_PAGES_URL);

  const chapter = await downloadChapter(downloadCache, pagesCache, reciterId, surah);
  const startVerseKey = chapter.verseTimings[0]?.verseKey;
  const stopVerseKey = chapter.verseTimings[chapter.verseTimings.length - 1]?.verseKey;
  if (!startVerseKey || !stopVerseKey) throw new Error("Chapter has no verse timings");

  return {
    kind: "surah",
    key: surah.id,
    reciterId,
    label: `${reciterLabel} · ${surah.name_simple}`,
    startVerseKey,
    stopVerseKey,
    stopChapterId: surah.id,
    chapters: [{ chapterId: chapter.chapterId, audioUrl: chapter.audioUrl }],
    pages: chapter.pages,
    sizeBytes: chapter.sizeBytes + versePagesBytes,
    downloadedAt: Date.now(),
  };
}

async function performDownloadJuz(
  juzNumber: number,
  chapters: SurahResult[],
  reciterId: number,
  reciterLabel: string,
): Promise<RecitationDownloadItem> {
  const bounds = await fetchJuzBounds(juzNumber);
  const downloadCache = await caches.open(RECITATION_DOWNLOAD_CACHE_NAME);
  const pagesCache = await caches.open(PAGES_CACHE_NAME);
  const versePagesBytes = await ensureCachedBytes(pagesCache, VERSE_PAGES_URL);

  const downloaded = await Promise.all(
    bounds.chapterIds.map((chapterId) => {
      const surah = chapters.find((c) => c.id === chapterId);
      if (!surah) throw new Error(`Unknown chapter ${chapterId}`);
      return downloadChapter(downloadCache, pagesCache, reciterId, surah);
    }),
  );

  const pages = Array.from(new Set(downloaded.flatMap((c) => c.pages))).sort((a, b) => a - b);
  const sizeBytes =
    downloaded.reduce((sum, c) => sum + c.sizeBytes, 0) + versePagesBytes;

  return {
    kind: "juz",
    key: juzNumber,
    reciterId,
    label: `${reciterLabel} · Juz ${juzNumber}`,
    startVerseKey: bounds.firstVerseKey,
    stopVerseKey: bounds.lastVerseKey,
    stopChapterId: bounds.lastChapterId,
    chapters: downloaded.map((c) => ({ chapterId: c.chapterId, audioUrl: c.audioUrl })),
    pages,
    sizeBytes,
    downloadedAt: Date.now(),
  };
}

/**
 * Owns the Offline Recitation download lifecycle (ADR 0046): a plain
 * client-side fetch+cache.put sequence per download (no service-worker
 * message-passing — unlike the bulk 604-page precache, a single chapter's
 * download is short enough to not need to survive tab backgrounding), the
 * localStorage registry of what's deliberately downloaded, and
 * reference-counted deletion of shared page assets.
 */
export const useRecitationDownload = () => {
  const [downloads, setDownloads] = useState<RecitationDownloadItem[]>([]);
  const [itemStates, setItemStates] = useState<Record<string, DownloadItemState>>({});

  useEffect(() => {
    setDownloads(storage.get("recitationDownloads") ?? []);
  }, []);

  const persist = useCallback((next: RecitationDownloadItem[]) => {
    storage.set("recitationDownloads", next);
    setDownloads(next);
  }, []);

  const setItemState = useCallback((id: string, state: DownloadItemState) => {
    setItemStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  const replaceItem = useCallback(
    (item: RecitationDownloadItem) => {
      setDownloads((prev) => {
        const next = [
          ...prev.filter((d) => !(d.kind === item.kind && d.key === item.key && d.reciterId === item.reciterId)),
          item,
        ];
        storage.set("recitationDownloads", next);
        return next;
      });
    },
    [],
  );

  const downloadSurah = useCallback(
    async (surah: SurahResult, reciterId: number, reciterLabel: string) => {
      const id = itemId("surah", surah.id, reciterId);
      setItemState(id, "downloading");
      try {
        const item = await performDownloadSurah(surah, reciterId, reciterLabel);
        replaceItem(item);
        setItemState(id, "downloaded");
      } catch {
        setItemState(id, "failed");
      }
    },
    [setItemState, replaceItem],
  );

  const downloadJuz = useCallback(
    async (juzNumber: number, chapters: SurahResult[], reciterId: number, reciterLabel: string) => {
      const id = itemId("juz", juzNumber, reciterId);
      setItemState(id, "downloading");
      try {
        const item = await performDownloadJuz(juzNumber, chapters, reciterId, reciterLabel);
        replaceItem(item);
        setItemState(id, "downloaded");
      } catch {
        setItemState(id, "failed");
      }
    },
    [setItemState, replaceItem],
  );

  // Reference-counts every shared asset before evicting it — audio+metadata
  // are reciter-scoped (a different reciter's chapter is a different cache
  // key already), but reader pages are edition-scoped only, so they're
  // checked against every remaining download regardless of reciter. Never
  // touches a page while the full 604-page bulk cache is complete — that
  // guarantee belongs to the other feature (ADR 0014) and must not regress
  // because a recitation download was removed.
  const deleteDownload = useCallback(
    async (item: RecitationDownloadItem) => {
      const remaining = downloads.filter(
        (d) => !(d.kind === item.kind && d.key === item.key && d.reciterId === item.reciterId),
      );

      const downloadCache = await caches.open(RECITATION_DOWNLOAD_CACHE_NAME);
      await Promise.all(
        item.chapters.map(async ({ chapterId, audioUrl }) => {
          const stillNeeded = remaining.some(
            (d) => d.reciterId === item.reciterId && d.chapters.some((c) => c.chapterId === chapterId),
          );
          if (stillNeeded) return;
          await downloadCache.delete(`/api/quran/recitations/${item.reciterId}/chapters/${chapterId}`);
          await downloadCache.delete(audioUrl);
        }),
      );

      const pagesCache = await caches.open(PAGES_CACHE_NAME);
      const bulkComplete = Boolean(await pagesCache.match(PRECACHE_SENTINEL_URL));
      if (!bulkComplete) {
        const pagesStillNeeded = new Set(remaining.flatMap((d) => d.pages));
        await Promise.all(
          item.pages
            .filter((p) => !pagesStillNeeded.has(p))
            .flatMap((p) => [pagesCache.delete(pageJsonUrl(p)), pagesCache.delete(pageFontUrl(p))]),
        );
      }

      // Drop the registry entry only once every cache eviction above has
      // actually completed — persisting first risked orphaning bytes in Cache
      // Storage with no registry entry left to retry the deletion from.
      persist(remaining);
    },
    [downloads, persist],
  );

  const getItemState = useCallback(
    (kind: DownloadKind, key: number, reciterId: number): DownloadItemState => {
      const id = itemId(kind, key, reciterId);
      if (itemStates[id]) return itemStates[id];
      return downloads.some((d) => d.kind === kind && d.key === key && d.reciterId === reciterId)
        ? "downloaded"
        : "idle";
    },
    [itemStates, downloads],
  );

  return { downloads, downloadSurah, downloadJuz, deleteDownload, getItemState };
};
