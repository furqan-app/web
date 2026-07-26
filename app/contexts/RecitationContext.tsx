"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";
import { storage } from "@/app/utils/storage";
import {
  fetchChapterAudio,
  fetchChapterVersePages,
  fetchReciters,
  fetchRiwayaChapterAudio,
  fetchRiwayaReciters,
  fetchStopPoint,
} from "@/app/utils/recitation-api";
import {
  decideChapterEnd,
  findActiveVerseTiming,
  findActiveWordLocation,
  parseChapterIdFromVerseKey,
  resolveRepeatTarget,
} from "@/app/utils/recitation";
import {
  DEFAULT_RECITATION_SETTINGS,
  QURAN_LAST_CHAPTER_ID,
  QURAN_LAST_VERSE_KEY,
  RECITATION_HIGHLIGHT_CLASS,
} from "@/app/constants/recitation";
import {
  RecitationSettings,
  RecitationStatus,
  Reciter,
  RiwayaVerseAudio,
  StopPoint,
  VerseTiming,
} from "@/app/types/recitation";

// Resolves where stopPoint should end playback, as a { verseKey, chapterId }
// target — the chapter may be later than the currently loaded one (e.g. a
// juz/hizb/rub/page can span a surah boundary). "none" is a hardcoded
// constant (no fetch). "surah" needs the chapter's own verseTimings, so it
// awaits chapterAudioPromise — but page/rub/hizb/juz only need verseKey, so
// their fetchStopPoint call can run concurrently with the chapter-audio
// fetch instead of waiting on it; callers should Promise.all this alongside
// chapterAudioPromise, not await chapterAudioPromise first. See
// docs/plans/recitation-playback.md Addendum 5.
async function resolveStopTarget(
  verseKey: string,
  stopPoint: StopPoint,
  chapterAudioPromise: Promise<{ verseTimings: VerseTiming[] }>,
  chapterId: number,
): Promise<{ verseKey: string; chapterId: number }> {
  if (stopPoint === "none") {
    return { verseKey: QURAN_LAST_VERSE_KEY, chapterId: QURAN_LAST_CHAPTER_ID };
  }
  if (stopPoint === "surah") {
    const { verseTimings } = await chapterAudioPromise;
    const lastVerseKey = verseTimings[verseTimings.length - 1]?.verseKey ?? verseKey;
    return { verseKey: lastVerseKey, chapterId };
  }
  return fetchStopPoint(verseKey, stopPoint);
}

// Riwaya equivalent of resolveStopTarget above — synchronous, no DB call,
// same-chapter only (juz/hizb/rub/none aren't offered in the riwaya
// stop-point picker; a stale value from a prior Hafs session falls back to
// "surah"). verses[] already carries .page per entry, so "page" needs no
// lookup beyond the array itself. See docs/plans/recitation-playback.md
// Addendum 8.
function resolveRiwayaStopVerseKey(
  verses: RiwayaVerseAudio[],
  startVerseKey: string,
  stopPoint: StopPoint,
): string {
  if (stopPoint === "page") {
    const startVerse = verses.find((v) => v.verseKey === startVerseKey);
    if (startVerse) {
      const pageVerses = verses.filter((v) => v.page === startVerse.page);
      const last = pageVerses[pageVerses.length - 1];
      if (last) return last.verseKey;
    }
  }
  return verses[verses.length - 1]?.verseKey ?? startVerseKey;
}

type RecitationContextType = {
  settings: RecitationSettings;
  updateSettings: (patch: Partial<RecitationSettings>) => void;
  reciters: Reciter[];
  status: RecitationStatus;
  currentVerseKey: string | null;
  currentWordLocation: string | null;
  // Mushaf page of the currently recited verse, or null when not playing. The
  // persistent pager (ADR 0028) watches this to keep the recited page on screen —
  // navigation lives in the pager, not here.
  recitedPage: number | null;
  // First verse_key of the currently displayed page, kept current by
  // RecitationPageSync — the voice panel's play button reads it as its
  // "play current Safha" start point (it cannot receive props from the pager).
  pageFirstVerseKey: string | null;
  setPageFirstVerseKey: (key: string | null) => void;
  play: (startVerseKey: string) => void;
  togglePlayPause: () => void;
  stop: () => void;
  registerWordRef: (location: string, el: HTMLElement | null) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const RecitationContext = createContext<RecitationContextType | undefined>(undefined);

function getInitialSettings(): RecitationSettings {
  if (typeof window !== "undefined") {
    const stored = storage.get("recitationSettings");
    if (stored) return { ...DEFAULT_RECITATION_SETTINGS, ...stored };
  }
  return DEFAULT_RECITATION_SETTINGS;
}

export function RecitationProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  const [settings, setSettings] = useState<RecitationSettings>(DEFAULT_RECITATION_SETTINGS);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [status, setStatus] = useState<RecitationStatus>("idle");
  const [currentVerseKey, setCurrentVerseKey] = useState<string | null>(null);
  const [currentWordLocation, setCurrentWordLocation] = useState<string | null>(null);
  const [recitedPage, setRecitedPage] = useState<number | null>(null);
  const [pageFirstVerseKey, setPageFirstVerseKey] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseTimingsRef = useRef<VerseTiming[]>([]);
  const versePagesRef = useRef<Record<string, number>>({});
  const versePagesCacheRef = useRef<Map<number, Record<string, number>>>(new Map());
  const startVerseKeyRef = useRef<string | null>(null);
  const stopVerseKeyRef = useRef<string | null>(null);
  const stopChapterIdRef = useRef<number | null>(null);
  const perAyahRepeatsDoneRef = useRef(0);
  const rangeRepeatsDoneRef = useRef(0);
  const currentVerseKeyRef = useRef<string | null>(null);
  const currentChapterIdRef = useRef<number | null>(null);
  // Shared by both engines below — only one can be "loaded" at a time since
  // play() dispatches to exactly one, so a single ref is sufficient (unlike
  // the verse-audio refs below, which hold genuinely different shapes).
  const loadedReciterIdRef = useRef<string | null>(null);
  const wordRefRegistry = useRef<Map<string, HTMLElement>>(new Map());
  const activeWordLocationRef = useRef<string | null>(null);
  const pendingSeekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Riwaya (non-Hafs) engine state — see docs/plans/recitation-playback.md
  // Addendum 8. Independent of verseTimingsRef above: the two engines never
  // run concurrently (play() dispatches to exactly one), but keeping them
  // separate avoids conflating QDC's shared-timeline verseTimings with
  // QuranHub's independent per-verse file list.
  const riwayaVersesRef = useRef<RiwayaVerseAudio[]>([]);
  const riwayaVerseIndexRef = useRef<number>(-1);
  const activeVerseHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    setSettings(getInitialSettings());
  }, []);

  // Reciter list — QDC's for Hafs, QuranHub's (scoped to the selected riwaya)
  // otherwise. Both providers return the unified Reciter shape (Addendum 8),
  // so this is the only fetch site regardless of which is active.
  useEffect(() => {
    let cancelled = false;
    const request =
      settings.riwaya === "hafs"
        ? fetchReciters(locale)
        : fetchRiwayaReciters(settings.riwaya, locale);
    request
      .then((data) => {
        if (!cancelled) setReciters(data);
      })
      .catch(() => {
        if (!cancelled) setReciters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [settings.riwaya, locale]);

  // Default to the first reciter once the live list loads, if the user has
  // never explicitly chosen one — lets the header quick-play button start
  // instantly without forcing the settings sheet open first. Also re-fires
  // after a riwaya switch, since the settings-sheet narration control resets
  // reciterId to null in the same update.
  useEffect(() => {
    if (settings.reciterId == null && reciters.length > 0) {
      updateSettings({ reciterId: reciters[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciters]);

  const updateSettings = useCallback((patch: Partial<RecitationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.set("recitationSettings", next);
      return next;
    });
  }, []);

  // Toggles RECITATION_HIGHLIGHT_CLASS on every word ref belonging to
  // verseKey (keys in wordRefRegistry are `${verseKey}:${position}`) — used
  // by the riwaya engine, which has no per-word timing to highlight a single
  // word with. See Addendum 8.
  const applyVerseHighlight = useCallback((verseKey: string | null) => {
    if (verseKey === activeVerseHighlightRef.current) return;
    const prevKey = activeVerseHighlightRef.current;
    if (prevKey) {
      const prefix = `${prevKey}:`;
      wordRefRegistry.current.forEach((el, location) => {
        if (location.startsWith(prefix)) el.classList.remove(RECITATION_HIGHLIGHT_CLASS);
      });
    }
    if (verseKey) {
      const prefix = `${verseKey}:`;
      wordRefRegistry.current.forEach((el, location) => {
        if (location.startsWith(prefix)) el.classList.add(RECITATION_HIGHLIGHT_CLASS);
      });
    }
    activeVerseHighlightRef.current = verseKey;
  }, []);

  const clearHighlight = useCallback(() => {
    const prevEl = activeWordLocationRef.current
      ? wordRefRegistry.current.get(activeWordLocationRef.current)
      : null;
    prevEl?.classList.remove(RECITATION_HIGHLIGHT_CLASS);
    activeWordLocationRef.current = null;
    setCurrentWordLocation(null);
    applyVerseHighlight(null);
  }, [applyVerseHighlight]);

  const applyWordHighlight = useCallback((newLocation: string | null) => {
    if (newLocation === activeWordLocationRef.current) return;
    const prevEl = activeWordLocationRef.current
      ? wordRefRegistry.current.get(activeWordLocationRef.current)
      : null;
    prevEl?.classList.remove(RECITATION_HIGHLIGHT_CLASS);
    const nextEl = newLocation ? wordRefRegistry.current.get(newLocation) : null;
    nextEl?.classList.add(RECITATION_HIGHLIGHT_CLASS);
    activeWordLocationRef.current = newLocation;
    setCurrentWordLocation(newLocation);
  }, []);

  const registerWordRef = useCallback((location: string, el: HTMLElement | null) => {
    if (el) wordRefRegistry.current.set(location, el);
    else wordRefRegistry.current.delete(location);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (pendingSeekTimeoutRef.current) {
      clearTimeout(pendingSeekTimeoutRef.current);
      pendingSeekTimeoutRef.current = null;
    }
    setStatus("idle");
    currentChapterIdRef.current = null;
    currentVerseKeyRef.current = null;
    riwayaVersesRef.current = [];
    riwayaVerseIndexRef.current = -1;
    setCurrentVerseKey(null);
    setRecitedPage(null);
    clearHighlight();
  }, [clearHighlight]);

  const getVersePages = useCallback(async (chapterId: number) => {
    const cached = versePagesCacheRef.current.get(chapterId);
    if (cached) return cached;
    const versePages = await fetchChapterVersePages(chapterId);
    versePagesCacheRef.current.set(chapterId, versePages);
    return versePages;
  }, []);

  const playHafs = useCallback(
    async (verseKey: string) => {
      const reciterId = settings.reciterId ?? reciters[0]?.id;
      if (!reciterId) return;

      const chapterId = parseChapterIdFromVerseKey(verseKey);
      setStatus("loading");

      try {
        // resolveStopTarget's DB-backed scopes (page/rub/hizb/juz) only need
        // verseKey, not chapterAudio — so it's kicked off alongside the
        // chapter-audio fetch instead of after it. "surah" internally awaits
        // the same chapterAudioPromise, so this never double-fetches.
        const chapterAudioPromise = fetchChapterAudio(reciterId, chapterId);
        const [chapterAudio, versePages, stopTarget] = await Promise.all([
          chapterAudioPromise,
          getVersePages(chapterId),
          resolveStopTarget(verseKey, settings.stopPoint, chapterAudioPromise, chapterId),
        ]);

        const startTiming = chapterAudio.verseTimings.find((vt) => vt.verseKey === verseKey);
        const audio = audioRef.current;
        if (!startTiming || !audio) {
          setStatus("idle");
          return;
        }

        verseTimingsRef.current = chapterAudio.verseTimings;
        versePagesRef.current = versePages;
        startVerseKeyRef.current = verseKey;
        stopVerseKeyRef.current = stopTarget.verseKey;
        stopChapterIdRef.current = stopTarget.chapterId;
        perAyahRepeatsDoneRef.current = 0;
        rangeRepeatsDoneRef.current = 0;
        currentVerseKeyRef.current = verseKey;
        currentChapterIdRef.current = chapterId;
        loadedReciterIdRef.current = reciterId;
        setCurrentVerseKey(verseKey);
        clearHighlight();

        audio.src = chapterAudio.audioUrl;
        audio.playbackRate = settings.playbackSpeed;
        audio.currentTime = startTiming.timestampFrom / 1000;
        await audio.play();
        setStatus("playing");
      } catch {
        setStatus("idle");
      }
    },
    [settings, reciters, getVersePages, clearHighlight],
  );

  // Riwaya engine — plays a chapter's independent per-verse audio files back
  // to back via the shared <audio> element's "ended" event (see
  // handleRiwayaVerseEnded below), instead of QDC's timeupdate/timestamp
  // approach. Supports speed, per-ayah repeat, range repeat, and
  // "page"/"surah" stop-points — all resolvable within this one fetched
  // chapter, no cross-chapter chaining. See Addendum 8.
  const playRiwaya = useCallback(
    async (verseKey: string) => {
      const editionId = settings.reciterId ?? reciters[0]?.id;
      if (!editionId) return;

      const chapterId = parseChapterIdFromVerseKey(verseKey);
      setStatus("loading");

      try {
        const chapterAudio = await fetchRiwayaChapterAudio(editionId, chapterId);
        const index = chapterAudio.verses.findIndex((v) => v.verseKey === verseKey);
        const verse = chapterAudio.verses[index];
        const audio = audioRef.current;
        if (index === -1 || !verse || !audio) {
          setStatus("idle");
          return;
        }

        riwayaVersesRef.current = chapterAudio.verses;
        riwayaVerseIndexRef.current = index;
        loadedReciterIdRef.current = editionId;
        currentChapterIdRef.current = chapterId;
        currentVerseKeyRef.current = verseKey;
        startVerseKeyRef.current = verseKey;
        stopVerseKeyRef.current = resolveRiwayaStopVerseKey(
          chapterAudio.verses,
          verseKey,
          settings.stopPoint,
        );
        perAyahRepeatsDoneRef.current = 0;
        rangeRepeatsDoneRef.current = 0;
        setCurrentVerseKey(verseKey);
        clearHighlight();
        applyVerseHighlight(verseKey);
        setRecitedPage(verse.page);

        audio.src = verse.audioUrl;
        audio.playbackRate = settings.playbackSpeed;
        await audio.play();
        setStatus("playing");
      } catch {
        setStatus("idle");
      }
    },
    [settings, reciters, clearHighlight, applyVerseHighlight],
  );

  // Riwaya equivalent of scheduleSeek — since a "seek" is just replaying the
  // same file from 0 (no timestamp), not a currentTime jump within a shared
  // audio file.
  const scheduleRiwayaReplay = useCallback((pauseMs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const replay = () => {
      audio.currentTime = 0;
      audio.play();
    };
    if (pauseMs > 0) {
      audio.pause();
      pendingSeekTimeoutRef.current = setTimeout(() => {
        replay();
        pendingSeekTimeoutRef.current = null;
      }, pauseMs);
    } else {
      replay();
    }
  }, []);

  // Riwaya equivalent of seekToRangeStart — same-chapter only (riwaya never
  // cross-chapter chains), so this is always a plain index/file swap, never
  // a reload.
  const seekToRiwayaRangeStart = useCallback(
    (pauseMs: number) => {
      const startVerseKey = startVerseKeyRef.current;
      const verses = riwayaVersesRef.current;
      const audio = audioRef.current;
      if (!startVerseKey || !audio) return;

      const startIndex = verses.findIndex((v) => v.verseKey === startVerseKey);
      const startVerse = verses[startIndex];
      if (startIndex === -1 || !startVerse) return;

      const seek = () => {
        riwayaVerseIndexRef.current = startIndex;
        currentVerseKeyRef.current = startVerseKey;
        setCurrentVerseKey(startVerseKey);
        applyVerseHighlight(startVerseKey);
        setRecitedPage(startVerse.page);
        audio.src = startVerse.audioUrl;
        audio.playbackRate = settings.playbackSpeed;
        audio.play();
      };

      if (pauseMs > 0) {
        audio.pause();
        pendingSeekTimeoutRef.current = setTimeout(() => {
          seek();
          pendingSeekTimeoutRef.current = null;
        }, pauseMs);
      } else {
        seek();
      }
    },
    [settings.playbackSpeed, applyVerseHighlight],
  );

  // Fires from the shared "ended" listener when the riwaya engine is active
  // (see the dispatcher below). Per-ayah replay / advance / range-repeat
  // seek-back / stop — mirrors handleChapterEnded's decision table but
  // file-swap-based instead of timestamp-based, and same-chapter only (no
  // cross-chapter chaining in this pass). See Addendum 8.
  const handleRiwayaVerseEnded = useCallback(() => {
    const verses = riwayaVersesRef.current;
    const audio = audioRef.current;
    const currentVerse = verses[riwayaVerseIndexRef.current];
    if (!audio || !currentVerse) {
      stop();
      return;
    }

    const perAyahTarget = resolveRepeatTarget(settings.perAyahRepeatCount);
    if (perAyahRepeatsDoneRef.current + 1 < perAyahTarget) {
      perAyahRepeatsDoneRef.current += 1;
      scheduleRiwayaReplay(settings.pauseBetweenRepeatsMs);
      return;
    }

    const isStopVerse = currentVerse.verseKey === stopVerseKeyRef.current;
    if (isStopVerse) {
      const rangeTarget = resolveRepeatTarget(settings.rangeRepeatCount);
      if (rangeRepeatsDoneRef.current + 1 < rangeTarget) {
        rangeRepeatsDoneRef.current += 1;
        perAyahRepeatsDoneRef.current = 0;
        seekToRiwayaRangeStart(settings.pauseBetweenRepeatsMs);
        return;
      }
      stop();
      return;
    }

    const nextIndex = riwayaVerseIndexRef.current + 1;
    const next = verses[nextIndex];
    if (!next) {
      stop();
      return;
    }

    perAyahRepeatsDoneRef.current = 0;
    riwayaVerseIndexRef.current = nextIndex;
    currentVerseKeyRef.current = next.verseKey;
    setCurrentVerseKey(next.verseKey);
    applyVerseHighlight(next.verseKey);
    setRecitedPage(next.page);

    audio.src = next.audioUrl;
    audio.playbackRate = settings.playbackSpeed;
    audio.play();
  }, [settings, stop, applyVerseHighlight, scheduleRiwayaReplay, seekToRiwayaRangeStart]);

  // Single entry point used by every caller (header quick-play, MarkModal's
  // "Play from here") — dispatches to whichever engine matches the currently
  // selected riwaya. See Addendum 8's engine-dispatch decision tree.
  const play = useCallback(
    (verseKey: string) => {
      if (settings.riwaya !== "hafs") return playRiwaya(verseKey);
      return playHafs(verseKey);
    },
    [settings.riwaya, playRiwaya, playHafs],
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
    } else if (status === "paused") {
      audio.play();
      setStatus("playing");
    }
  }, [status]);

  const scheduleSeek = useCallback((timestampFromMs: number, pauseMs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (pauseMs > 0) {
      audio.pause();
      pendingSeekTimeoutRef.current = setTimeout(() => {
        audio.currentTime = timestampFromMs / 1000;
        audio.play();
        pendingSeekTimeoutRef.current = null;
      }, pauseMs);
    } else {
      audio.currentTime = timestampFromMs / 1000;
      // Always (re)start playback here, not just in the pauseMs>0 branch —
      // scheduleSeek is also called from handleChapterEnded, where the audio
      // is already paused (the native "ended" event fires with audio.paused
      // === true). Calling play() on already-playing audio (the
      // handleTimeUpdate call site) is a harmless no-op.
      audio.play();
    }
  }, []);

  // Publish the Mushaf page of the recited verse. The persistent pager (ADR 0028)
  // owns navigation, so it — not this context — keeps that page on screen; here we
  // only report the page. versePagesRef is populated for the loaded chapter by
  // loadChapter, so the lookup resolves for every verse of the playing chapter.
  const updateRecitedPage = useCallback((verseKey: string) => {
    const pageNumber = versePagesRef.current[verseKey];
    if (pageNumber != null) setRecitedPage(pageNumber);
  }, []);

  // Fetches chapterId's audio + verse-pages, loads it into the shared refs
  // and the <audio> element, seeks to seekVerseKey's timestampFrom (or the
  // chapter's first verse if omitted), and plays. Shared by chainToNextChapter
  // and seekToRangeStart's cross-chapter reload — both need the identical
  // "swap the loaded chapter" sequence; keeping one copy avoids the two
  // silently drifting apart. Returns false (caller should stop()) if the
  // audio element is gone or seekVerseKey isn't actually in the fetched
  // chapter (a stale/incorrect stop target). Hafs-only — the riwaya engine
  // never cross-chapter chains in this pass (Addendum 8).
  const loadChapter = useCallback(
    async (reciterId: string, chapterId: number, seekVerseKey?: string): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      const [chapterAudio, versePages] = await Promise.all([
        fetchChapterAudio(reciterId, chapterId),
        getVersePages(chapterId),
      ]);
      const targetVerseKey = seekVerseKey ?? chapterAudio.verseTimings[0]?.verseKey ?? null;
      const targetTiming = targetVerseKey
        ? chapterAudio.verseTimings.find((vt) => vt.verseKey === targetVerseKey)
        : undefined;
      if (seekVerseKey && !targetTiming) return false;

      verseTimingsRef.current = chapterAudio.verseTimings;
      versePagesRef.current = versePages;
      currentChapterIdRef.current = chapterId;
      perAyahRepeatsDoneRef.current = 0;
      currentVerseKeyRef.current = targetVerseKey;
      setCurrentVerseKey(targetVerseKey);
      if (targetVerseKey) updateRecitedPage(targetVerseKey);

      audio.src = chapterAudio.audioUrl;
      audio.playbackRate = settings.playbackSpeed;
      audio.currentTime = (targetTiming?.timestampFrom ?? 0) / 1000;
      await audio.play();
      return true;
    },
    [settings.playbackSpeed, getVersePages, updateRecitedPage],
  );

  // Loads chapterId + 1's audio and keeps playing from its start — the
  // currently-loaded chapter's audio has ended but the resolved stop verse
  // is in a later chapter (juz/hizb/rub/page spanning a surah boundary, or
  // stopPoint "none"). See docs/plans/recitation-playback.md Addendum 5 —
  // supersedes ADR 0021's original "no cross-chapter auto-continue".
  const chainToNextChapter = useCallback(
    async (nextChapterId: number) => {
      const reciterId = settings.reciterId ?? reciters[0]?.id;
      if (!reciterId) {
        stop();
        return;
      }
      try {
        const ok = await loadChapter(reciterId, nextChapterId);
        if (!ok) stop();
      } catch {
        stop();
      }
    },
    [settings.reciterId, reciters, loadChapter, stop],
  );

  // Seeks playback back to startVerseKey for a whole-range repeat. If
  // startVerseKey's chapter is still the one currently loaded, this is a
  // plain in-place seek (unchanged behavior). If we've since chained forward
  // into a later chapter, reload startVerseKey's chapter's audio via
  // loadChapter first.
  const seekToRangeStart = useCallback(
    (pauseMs: number) => {
      const startVerseKey = startVerseKeyRef.current;
      const audio = audioRef.current;
      if (!startVerseKey || !audio) return;

      const startChapterId = parseChapterIdFromVerseKey(startVerseKey);
      if (startChapterId === currentChapterIdRef.current) {
        const startTiming = verseTimingsRef.current.find((vt) => vt.verseKey === startVerseKey);
        if (startTiming) {
          // Must update currentVerseKeyRef (and mirror it into state/page-follow)
          // here, not just seek the audio — handleTimeUpdate reads this ref as
          // previousVerseKey on the next tick. Left stale at the stop verse,
          // isStopVerse would evaluate true again immediately, re-triggering
          // range-repeat/stop instead of resuming forward playback. Mirrors
          // loadChapter's cross-chapter reload path (which sets this correctly
          // already). See docs/plans/recitation-playback.md Addendum 7.
          currentVerseKeyRef.current = startVerseKey;
          setCurrentVerseKey(startVerseKey);
          updateRecitedPage(startVerseKey);
          scheduleSeek(startTiming.timestampFrom, pauseMs);
        }
        return;
      }

      const reciterId = settings.reciterId ?? reciters[0]?.id;
      if (!reciterId) return;

      const reload = async () => {
        const ok = await loadChapter(reciterId, startChapterId, startVerseKey);
        if (!ok) stop();
      };

      if (pauseMs > 0) {
        audio.pause();
        pendingSeekTimeoutRef.current = setTimeout(() => {
          reload();
          pendingSeekTimeoutRef.current = null;
        }, pauseMs);
      } else {
        reload();
      }
    },
    [settings.reciterId, reciters, loadChapter, scheduleSeek, stop, updateRecitedPage],
  );

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    const verseTimings = verseTimingsRef.current;
    if (!audio || verseTimings.length === 0) return;
    // pause() (called by stop()/togglePlayPause) always queues one more
    // "timeupdate" event afterward per the HTML spec, even though `paused`
    // itself flips synchronously beforehand. Without this guard that stray
    // tick resurrects currentVerseKey/recitedPage/highlight right after
    // stop() clears them (previousVerseKey reads null, so the verse-changed
    // branch below fires) — see docs/plans/tablet-nav-overlay.md's bug-fix
    // addendum.
    if (audio.paused) return;

    const currentTimeMs = audio.currentTime * 1000;
    const activeTiming = findActiveVerseTiming(verseTimings, currentTimeMs);
    if (!activeTiming) return;

    const previousVerseKey = currentVerseKeyRef.current;

    if (activeTiming.verseKey !== previousVerseKey) {
      const previousTiming = verseTimings.find((vt) => vt.verseKey === previousVerseKey);
      const perAyahTarget = resolveRepeatTarget(settings.perAyahRepeatCount);

      if (previousTiming && perAyahRepeatsDoneRef.current + 1 < perAyahTarget) {
        perAyahRepeatsDoneRef.current += 1;
        scheduleSeek(previousTiming.timestampFrom, settings.pauseBetweenRepeatsMs);
        return;
      }

      // verse_key is globally unique ("2:141" only exists in chapter 2), so
      // matching it alone is sufficient — no need to also compare chapter id.
      const isStopVerse = previousVerseKey === stopVerseKeyRef.current;
      if (previousTiming && isStopVerse) {
        const rangeTarget = resolveRepeatTarget(settings.rangeRepeatCount);
        if (rangeRepeatsDoneRef.current + 1 < rangeTarget) {
          rangeRepeatsDoneRef.current += 1;
          perAyahRepeatsDoneRef.current = 0;
          seekToRangeStart(settings.pauseBetweenRepeatsMs);
          return;
        }
        stop();
        return;
      }

      perAyahRepeatsDoneRef.current = 0;
      currentVerseKeyRef.current = activeTiming.verseKey;
      setCurrentVerseKey(activeTiming.verseKey);
      updateRecitedPage(activeTiming.verseKey);
    }

    applyWordHighlight(findActiveWordLocation(activeTiming, currentTimeMs));
  }, [settings, scheduleSeek, seekToRangeStart, stop, updateRecitedPage, applyWordHighlight]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [handleTimeUpdate]);

  // Fires when the currently-loaded chapter's audio physically finishes.
  // `timeupdate`'s verse-transition detection (above) only fires when moving
  // FROM one verse INTO another within the same loaded audio — it can never
  // fire for the chapter's literal last verse, since findActiveVerseTiming
  // clamps to it forever once reached. This was a latent gap even before
  // this addendum (stopPoint: "surah" reaching the chapter's actual last
  // verse never called stop() via code, only via the browser silently
  // pausing) and is also the only place cross-chapter chaining can hook in.
  // See docs/plans/recitation-playback.md Addendum 5.
  const handleChapterEnded = useCallback(() => {
    const chapterId = currentChapterIdRef.current;
    const verseTimings = verseTimingsRef.current;
    const lastTiming = verseTimings[verseTimings.length - 1];
    if (chapterId == null || !lastTiming) return;

    const perAyahTarget = resolveRepeatTarget(settings.perAyahRepeatCount);
    if (perAyahRepeatsDoneRef.current + 1 < perAyahTarget) {
      perAyahRepeatsDoneRef.current += 1;
      scheduleSeek(lastTiming.timestampFrom, settings.pauseBetweenRepeatsMs);
      return;
    }

    const decision = decideChapterEnd(
      chapterId,
      stopChapterIdRef.current,
      settings.stopPoint,
      rangeRepeatsDoneRef.current,
      resolveRepeatTarget(settings.rangeRepeatCount),
    );
    switch (decision.action) {
      case "repeat-range":
        rangeRepeatsDoneRef.current += 1;
        perAyahRepeatsDoneRef.current = 0;
        seekToRangeStart(settings.pauseBetweenRepeatsMs);
        return;
      case "chain":
        chainToNextChapter(decision.nextChapterId);
        return;
      case "stop":
        stop();
        return;
    }
  }, [settings, scheduleSeek, seekToRangeStart, chainToNextChapter, stop]);

  // Dispatches the shared <audio> element's native "ended" event to whichever
  // engine is active — mirrors play()'s dispatch. See Addendum 8.
  const handleAudioEnded = useCallback(() => {
    if (settings.riwaya !== "hafs") return handleRiwayaVerseEnded();
    return handleChapterEnded();
  }, [settings.riwaya, handleRiwayaVerseEnded, handleChapterEnded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener("ended", handleAudioEnded);
    return () => audio.removeEventListener("ended", handleAudioEnded);
  }, [handleAudioEnded]);

  // Live playback speed changes (no reload needed).
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = settings.playbackSpeed;
  }, [settings.playbackSpeed]);

  // Stop-point changed mid-session (via the player bar's settings sheet) —
  // recompute where the range should end without restarting playback.
  // Recomputed relative to the verse currently playing (not the original
  // startVerseKey) — if playback has already chained past the original
  // verse's chapter, "end of surah/hizb/rub/juz/page" should mean the one
  // containing where we are now, not one already behind us. Riwaya branch is
  // synchronous (no DB call) — see resolveRiwayaStopVerseKey.
  useEffect(() => {
    if (status === "idle") return;
    const referenceVerseKey = currentVerseKeyRef.current ?? startVerseKeyRef.current;
    if (!referenceVerseKey) return;

    if (settings.riwaya !== "hafs") {
      stopVerseKeyRef.current = resolveRiwayaStopVerseKey(
        riwayaVersesRef.current,
        referenceVerseKey,
        settings.stopPoint,
      );
      return;
    }

    let cancelled = false;
    (async () => {
      const target = await resolveStopTarget(
        referenceVerseKey,
        settings.stopPoint,
        Promise.resolve({ verseTimings: verseTimingsRef.current }),
        currentChapterIdRef.current ?? parseChapterIdFromVerseKey(referenceVerseKey),
      );
      if (!cancelled) {
        stopVerseKeyRef.current = target.verseKey;
        stopChapterIdRef.current = target.chapterId;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.stopPoint]);

  // Reciter changed mid-session (riwaya itself unchanged — see the effect
  // below for a riwaya change) — reload the current chapter's audio for the
  // new reciter and resume at the same verse. Branches internally on
  // settings.riwaya since the two engines fetch/reload differently (Addendum
  // 8), but this is one effect/one trigger field for both.
  useEffect(() => {
    const reciterId = settings.reciterId;
    const chapterId = currentChapterIdRef.current;
    if (
      status === "idle" ||
      reciterId == null ||
      chapterId == null ||
      reciterId === loadedReciterIdRef.current
    ) {
      return;
    }

    let cancelled = false;
    (async () => {
      const audio = audioRef.current;
      if (!audio) return;
      const wasPlaying = status === "playing";

      if (settings.riwaya === "hafs") {
        const chapterAudio = await fetchChapterAudio(reciterId, chapterId);
        if (cancelled) return;
        const timing = chapterAudio.verseTimings.find(
          (vt) => vt.verseKey === currentVerseKeyRef.current,
        );
        if (!timing) return;
        verseTimingsRef.current = chapterAudio.verseTimings;
        loadedReciterIdRef.current = reciterId;
        audio.src = chapterAudio.audioUrl;
        audio.playbackRate = settings.playbackSpeed;
        audio.currentTime = timing.timestampFrom / 1000;
        if (wasPlaying) audio.play();
      } else {
        const chapterAudio = await fetchRiwayaChapterAudio(reciterId, chapterId);
        if (cancelled) return;
        const index = chapterAudio.verses.findIndex(
          (v) => v.verseKey === currentVerseKeyRef.current,
        );
        const verse = chapterAudio.verses[index];
        if (!verse) return;
        riwayaVersesRef.current = chapterAudio.verses;
        riwayaVerseIndexRef.current = index;
        loadedReciterIdRef.current = reciterId;
        audio.src = verse.audioUrl;
        audio.playbackRate = settings.playbackSpeed;
        if (wasPlaying) audio.play();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.reciterId]);

  // Riwaya itself changed mid-session (crosses engines — highlight mode and
  // data source both change) — stop rather than attempt an in-place reload.
  // Confirmed with user 2026-07-27, see Addendum 8.
  const prevRiwayaRef = useRef(settings.riwaya);
  useEffect(() => {
    if (prevRiwayaRef.current !== settings.riwaya && status !== "idle") {
      stop();
    }
    prevRiwayaRef.current = settings.riwaya;
  }, [settings.riwaya, status, stop]);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  return (
    <RecitationContext.Provider
      value={{
        settings,
        updateSettings,
        reciters,
        status,
        currentVerseKey,
        currentWordLocation,
        recitedPage,
        pageFirstVerseKey,
        setPageFirstVerseKey,
        play,
        togglePlayPause,
        stop,
        registerWordRef,
        isSettingsOpen,
        openSettings,
        closeSettings,
      }}
    >
      {/* Mounted once above the reader's route tree so playback survives both
          page auto-advance (client-side nav) and leaving the reader entirely
          (background mini-player) — see ADR 0021. */}
      <audio ref={audioRef} preload="none" />
      {children}
    </RecitationContext.Provider>
  );
}

export function useRecitation() {
  const context = useContext(RecitationContext);
  if (context === undefined) {
    throw new Error("useRecitation must be used within a RecitationProvider");
  }
  return context;
}
