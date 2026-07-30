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
  fetchReciters,
  fetchStopPoint,
} from "@/app/utils/recitation-api";
import { fetchVersePages } from "@/app/hooks/use-verse-pages";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
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
  mushafId: number,
): Promise<{ verseKey: string; chapterId: number }> {
  if (stopPoint === "none") {
    return { verseKey: QURAN_LAST_VERSE_KEY, chapterId: QURAN_LAST_CHAPTER_ID };
  }
  if (stopPoint === "surah") {
    const { verseTimings } = await chapterAudioPromise;
    const lastVerseKey = verseTimings[verseTimings.length - 1]?.verseKey ?? verseKey;
    return { verseKey: lastVerseKey, chapterId };
  }
  return fetchStopPoint(verseKey, stopPoint, mushafId);
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

  const { mushafId } = useQuranMushaf();

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
  // Keyed by mushaf edition, not chapter: the map is whole-mushaf and a page
  // number only means something relative to an edition (ADR 0033).
  const versePagesCacheRef = useRef<Map<number, Record<string, number>>>(new Map());
  const startVerseKeyRef = useRef<string | null>(null);
  const stopVerseKeyRef = useRef<string | null>(null);
  const stopChapterIdRef = useRef<number | null>(null);
  const perAyahRepeatsDoneRef = useRef(0);
  const rangeRepeatsDoneRef = useRef(0);
  const currentVerseKeyRef = useRef<string | null>(null);
  const currentChapterIdRef = useRef<number | null>(null);
  const loadedReciterIdRef = useRef<number | null>(null);
  const wordRefRegistry = useRef<Map<string, HTMLElement>>(new Map());
  const activeWordLocationRef = useRef<string | null>(null);
  const pendingSeekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSettings(getInitialSettings());
  }, []);

  useEffect(() => {
    fetchReciters(locale)
      .then(setReciters)
      .catch(() => setReciters([]));
  }, [locale]);

  // Default to the first reciter once the live list loads, if the user has
  // never explicitly chosen one — lets the header quick-play button start
  // instantly without forcing the settings sheet open first.
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

  const clearHighlight = useCallback(() => {
    const prevEl = activeWordLocationRef.current
      ? wordRefRegistry.current.get(activeWordLocationRef.current)
      : null;
    prevEl?.classList.remove(RECITATION_HIGHLIGHT_CLASS);
    activeWordLocationRef.current = null;
    setCurrentWordLocation(null);
  }, []);

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
    setCurrentVerseKey(null);
    setRecitedPage(null);
    clearHighlight();
  }, [clearHighlight]);

  // verse_key → page for the ACTIVE edition. Recitation follow navigates to the
  // page it reports, so resolving against the default edition sent the reader to
  // another edition's page mid-playback — e.g. reciting tajweed page 586 and
  // reaching Abasa's last verses jumped back to 585, where the default edition
  // puts them. 56 verses differ between the shipped editions (ADR 0033).
  const getVersePages = useCallback(async () => {
    const cached = versePagesCacheRef.current.get(mushafId);
    if (cached) return cached;
    const versePages = await fetchVersePages(mushafId);
    versePagesCacheRef.current.set(mushafId, versePages);
    return versePages;
  }, [mushafId]);

  const play = useCallback(
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
          getVersePages(),
          resolveStopTarget(verseKey, settings.stopPoint, chapterAudioPromise, chapterId, mushafId),
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
    [settings, reciters, getVersePages, clearHighlight, mushafId],
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
  // Re-resolve the recited page when the edition changes mid-playback: the map
  // loaded at chapter start belongs to the previous edition, and the follow
  // behaviour would otherwise keep steering to that edition's pages.
  useEffect(() => {
    const verseKey = currentVerseKeyRef.current;
    if (!verseKey) return;
    let cancelled = false;
    getVersePages()
      .then((versePages) => {
        if (cancelled) return;
        versePagesRef.current = versePages;
        const page = versePages[verseKey];
        if (page != null) setRecitedPage(page);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mushafId, getVersePages]);

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
  // chapter (a stale/incorrect stop target).
  const loadChapter = useCallback(
    async (reciterId: number, chapterId: number, seekVerseKey?: string): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      const [chapterAudio, versePages] = await Promise.all([
        fetchChapterAudio(reciterId, chapterId),
        getVersePages(),
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener("ended", handleChapterEnded);
    return () => audio.removeEventListener("ended", handleChapterEnded);
  }, [handleChapterEnded]);

  // Live playback speed changes (no reload needed).
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = settings.playbackSpeed;
  }, [settings.playbackSpeed]);

  // Stop-point changed mid-session (via the player bar's settings sheet) —
  // recompute where the range should end without restarting playback.
  // Recomputed relative to the verse currently playing (not the original
  // startVerseKey) — if playback has already chained past the original
  // verse's chapter, "end of surah/hizb/rub/juz/page" should mean the one
  // containing where we are now, not one already behind us.
  useEffect(() => {
    if (status === "idle") return;
    const referenceVerseKey = currentVerseKeyRef.current ?? startVerseKeyRef.current;
    if (!referenceVerseKey) return;
    let cancelled = false;
    (async () => {
      const target = await resolveStopTarget(
        referenceVerseKey,
        settings.stopPoint,
        Promise.resolve({ verseTimings: verseTimingsRef.current }),
        currentChapterIdRef.current ?? parseChapterIdFromVerseKey(referenceVerseKey),
        mushafId,
      );
      if (!cancelled) {
        stopVerseKeyRef.current = target.verseKey;
        stopChapterIdRef.current = target.chapterId;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Also re-runs on mushafId: an "end of page" stop belongs to one edition, so
    // switching mushaf mid-playback must recompute where the range ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.stopPoint, mushafId]);

  // Reciter changed mid-session — reload the current chapter's audio for the
  // new reciter and resume at the same verse position.
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
      const chapterAudio = await fetchChapterAudio(reciterId, chapterId);
      if (cancelled) return;
      verseTimingsRef.current = chapterAudio.verseTimings;
      loadedReciterIdRef.current = reciterId;

      const timing = chapterAudio.verseTimings.find(
        (vt) => vt.verseKey === currentVerseKeyRef.current,
      );
      const audio = audioRef.current;
      if (!audio || !timing) return;

      const wasPlaying = status === "playing";
      audio.src = chapterAudio.audioUrl;
      audio.playbackRate = settings.playbackSpeed;
      audio.currentTime = timing.timestampFrom / 1000;
      if (wasPlaying) audio.play();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.reciterId]);

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
