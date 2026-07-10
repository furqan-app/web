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
import { usePathname, useRouter } from "@/i18n/routing";
import { storage } from "@/app/utils/storage";
import { useQuranSafhaView } from "@/app/contexts/QuranSafhaViewContext";
import { useIsLgUp } from "@/app/hooks/use-is-lg-up";
import {
  fetchChapterAudio,
  fetchChapterVersePages,
  fetchReciters,
} from "@/app/utils/recitation-api";
import {
  computeStopVerseKey,
  computeVisiblePageSet,
  findActiveVerseTiming,
  findActiveWordLocation,
  parseChapterIdFromVerseKey,
  parseReaderPathname,
  resolveRepeatTarget,
} from "@/app/utils/recitation";
import {
  DEFAULT_RECITATION_SETTINGS,
  RECITATION_HIGHLIGHT_CLASS,
} from "@/app/constants/recitation";
import {
  RecitationSettings,
  RecitationStatus,
  Reciter,
  VerseTiming,
} from "@/app/types/recitation";

type RecitationContextType = {
  settings: RecitationSettings;
  updateSettings: (patch: Partial<RecitationSettings>) => void;
  reciters: Reciter[];
  status: RecitationStatus;
  currentVerseKey: string | null;
  currentWordLocation: string | null;
  play: (startVerseKey: string) => void;
  togglePlayPause: () => void;
  stop: () => void;
  registerWordRef: (location: string, el: HTMLElement | null) => void;
  isSettingsOpen: boolean;
  settingsStartVerseKey: string | null;
  openSettings: (startVerseKey?: string) => void;
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
  const pathname = usePathname();
  const router = useRouter();
  const { view: safhaView } = useQuranSafhaView();
  const isLgUp = useIsLgUp();

  const [settings, setSettings] = useState<RecitationSettings>(DEFAULT_RECITATION_SETTINGS);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [status, setStatus] = useState<RecitationStatus>("idle");
  const [currentVerseKey, setCurrentVerseKey] = useState<string | null>(null);
  const [currentWordLocation, setCurrentWordLocation] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsStartVerseKey, setSettingsStartVerseKey] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseTimingsRef = useRef<VerseTiming[]>([]);
  const versePagesRef = useRef<Record<string, number>>({});
  const versePagesCacheRef = useRef<Map<number, Record<string, number>>>(new Map());
  const startVerseKeyRef = useRef<string | null>(null);
  const stopVerseKeyRef = useRef<string | null>(null);
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
    fetchReciters()
      .then(setReciters)
      .catch(() => setReciters([]));
  }, []);

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
    clearHighlight();
  }, [clearHighlight]);

  const getVersePages = useCallback(async (chapterId: number) => {
    const cached = versePagesCacheRef.current.get(chapterId);
    if (cached) return cached;
    const versePages = await fetchChapterVersePages(chapterId);
    versePagesCacheRef.current.set(chapterId, versePages);
    return versePages;
  }, []);

  const play = useCallback(
    async (verseKey: string) => {
      const reciterId = settings.reciterId ?? reciters[0]?.id;
      if (!reciterId) return;

      const chapterId = parseChapterIdFromVerseKey(verseKey);
      setStatus("loading");

      try {
        const [chapterAudio, versePages] = await Promise.all([
          fetchChapterAudio(reciterId, chapterId),
          getVersePages(chapterId),
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
        stopVerseKeyRef.current = computeStopVerseKey(
          chapterAudio.verseTimings,
          versePages,
          verseKey,
          settings.stopPoint,
        );
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
    }
  }, []);

  const followPage = useCallback(
    (verseKey: string) => {
      const pageNumber = versePagesRef.current[verseKey];
      if (pageNumber == null) return;
      const readerLocation = parseReaderPathname(pathname);
      if (!readerLocation) return; // background playback — no page to follow
      const isDoubleViewActive = safhaView === "double" && isLgUp;
      const visibleSet = computeVisiblePageSet(readerLocation.pageId, isDoubleViewActive);
      if (!visibleSet.has(pageNumber)) {
        router.push(`${readerLocation.basePath}/${pageNumber}`);
      }
    },
    [pathname, safhaView, isLgUp, router],
  );

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    const verseTimings = verseTimingsRef.current;
    if (!audio || verseTimings.length === 0) return;

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

      const isStopVerse = previousVerseKey === stopVerseKeyRef.current;
      if (previousTiming && isStopVerse) {
        const rangeTarget = resolveRepeatTarget(settings.rangeRepeatCount);
        if (rangeRepeatsDoneRef.current + 1 < rangeTarget) {
          rangeRepeatsDoneRef.current += 1;
          perAyahRepeatsDoneRef.current = 0;
          const startTiming = verseTimings.find(
            (vt) => vt.verseKey === startVerseKeyRef.current,
          );
          if (startTiming) {
            scheduleSeek(startTiming.timestampFrom, settings.pauseBetweenRepeatsMs);
          }
          return;
        }
        stop();
        return;
      }

      perAyahRepeatsDoneRef.current = 0;
      currentVerseKeyRef.current = activeTiming.verseKey;
      setCurrentVerseKey(activeTiming.verseKey);
      followPage(activeTiming.verseKey);
    }

    applyWordHighlight(findActiveWordLocation(activeTiming, currentTimeMs));
  }, [settings, scheduleSeek, stop, followPage, applyWordHighlight]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [handleTimeUpdate]);

  // Live playback speed changes (no reload needed).
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = settings.playbackSpeed;
  }, [settings.playbackSpeed]);

  // Stop-point changed mid-session (via the player bar's settings sheet) —
  // recompute where the current range should end without restarting playback.
  useEffect(() => {
    if (status === "idle" || !startVerseKeyRef.current) return;
    stopVerseKeyRef.current = computeStopVerseKey(
      verseTimingsRef.current,
      versePagesRef.current,
      startVerseKeyRef.current,
      settings.stopPoint,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.stopPoint]);

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

  const openSettings = useCallback((startVerseKey?: string) => {
    setSettingsStartVerseKey(startVerseKey ?? null);
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setSettingsStartVerseKey(null);
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
        play,
        togglePlayPause,
        stop,
        registerWordRef,
        isSettingsOpen,
        settingsStartVerseKey,
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
