"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleDashed,
  CircleDot,
  CircleUserRound,
  FileText,
  Gauge,
  Headphones,
  Infinity as InfinityIcon,
  MapPin,
  Minus,
  Play,
  Plus,
  Repeat1,
  Repeat2,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { useRecitation } from "@/app/contexts/RecitationContext";
import type { StartPoint } from "@/app/contexts/RecitationContext";
import { ReciterCombobox } from "@/app/components/recitation/ReciterCombobox";
import { getLanguageDirection } from "@/app/utils/i18n";
import useTranslations from "@/app/hooks/use-translations";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  PAUSE_BETWEEN_REPEATS_MAX_MS,
  PAUSE_BETWEEN_REPEATS_STEP_MS,
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  PLAYBACK_SPEED_STEP,
  REPEAT_COUNT_MAX,
  REPEAT_COUNT_MIN,
} from "@/app/constants/recitation";
import {
  RangePoint,
  RecitationSettings,
  RecitationStatus,
  Reciter,
  RepeatCount,
  StopPoint,
} from "@/app/types/recitation";
import { SurahResult } from "@/app/types";
import { MUSHAF_LAST_PAGE } from "@/app/constants/plans";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import { cn } from "@/lib/utils";

const nextRepeatCount = (value: RepeatCount, direction: 1 | -1): RepeatCount => {
  if (direction === 1) {
    if (value === "infinite") return "infinite";
    return value >= REPEAT_COUNT_MAX ? "infinite" : ((value + 1) as RepeatCount);
  }
  if (value === "infinite") return REPEAT_COUNT_MAX;
  return value <= REPEAT_COUNT_MIN ? REPEAT_COUNT_MIN : ((value - 1) as RepeatCount);
};

const SectionHeader = ({
  label,
}: {
  icon?: typeof Users;
  label: string;
}) => (
  <div className="fq-overline mb-2">{label}</div>
);

const STOP_POINT_OPTIONS: { value: StopPoint; icon: typeof Users; labelKey: string; fallback: string }[] = [
  { value: "page", icon: FileText, labelKey: "recitation.stopPointPage", fallback: "End of page" },
  { value: "rub", icon: CircleDot, labelKey: "recitation.stopPointRub", fallback: "End of rub" },
  { value: "hizb", icon: CircleDashed, labelKey: "recitation.stopPointHizb", fallback: "End of hizb" },
  { value: "juz", icon: BookOpen, labelKey: "recitation.stopPointJuz", fallback: "End of Juz'" },
  { value: "surah", icon: BookMarked, labelKey: "recitation.stopPointSurah", fallback: "End of surah" },
  { value: "none", icon: InfinityIcon, labelKey: "recitation.stopPointNone", fallback: "No stop" },
  { value: "custom", icon: MapPin, labelKey: "recitation.stopPointCustom", fallback: "Custom point" },
];

const RANGE_TYPE_OPTIONS: { value: RangePoint["type"]; icon: typeof Users; labelKey: string; fallback: string }[] = [
  { value: "page", icon: FileText, labelKey: "recitation.rangeTypePage", fallback: "Page" },
  { value: "verse", icon: BookMarked, labelKey: "recitation.rangeTypeVerse", fallback: "Verse" },
];

// Ordered verse-key comparison for the mutual push-apart rule (#393 D6):
// "s:v" compares by surah then ayah. Both sides of a drafted range are
// normalized to this form before comparing — equality is legal (a
// single-verse practice window).
export const compareVerseKeys = (a: string, b: string): number => {
  const [as, aa] = a.split(":").map(Number);
  const [bs, ba] = b.split(":").map(Number);
  return as !== bs ? as - bs : aa - ba;
};

const ReciterTrigger = forwardRef<
  HTMLButtonElement,
  { selected: Reciter | null; open: boolean } & React.ComponentPropsWithoutRef<"button">
>(({ selected, open, ...props }, ref) => {
  const t = useTranslations();
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      className="fq-section-row fq-focus-ring w-full rounded-xl border border-border bg-card text-start transition-colors hover:bg-muted/30"
      {...props}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <CircleUserRound className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground leading-tight block truncate">
            {selected ? selected.translatedName : t("recitation.reciterPlaceholder", "Choose a reciter")}
          </span>
          {selected?.style ? (
            <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block truncate">
              {selected.style}
            </span>
          ) : null}
        </div>
      </div>
      <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
    </button>
  );
});
ReciterTrigger.displayName = "ReciterTrigger";

const SurahCombobox = ({
  chapters,
  value,
  minSurah,
  maxSurah,
  onChange,
  portalContainer,
  disabled = false,
}: {
  chapters: SurahResult[];
  value: number | null;
  minSurah?: number;
  // Ceiling for the START picker's surah dropdown (#393) — start can't go
  // past the drafted end. Absent for the END picker, which floors instead.
  maxSurah?: number;
  onChange: (surah: number) => void;
  portalContainer: HTMLElement | null;
  disabled?: boolean;
}) => {
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const options = chapters.filter(
    (c) => c.id >= (minSurah ?? 1) && c.id <= (maxSurah ?? 114),
  );
  const selected = chapters.find((c) => c.id === value) ?? null;
  const displayName = (c: SurahResult) => (locale === "ar" ? c.name_arabic : c.name_simple);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          disabled={disabled}
          className="flex-1 fq-section-row rounded-xl border border-border bg-card text-start py-2 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
        >
          <span className="truncate">
            {selected ? displayName(selected) : t("recitation.surahPlaceholder", "Choose a surah")}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" container={portalContainer}>
        <Command>
          <CommandInput placeholder={t("recitation.surahSearchPlaceholder", "Search surahs…")} />
          <CommandList>
            <CommandEmpty>{t("recitation.surahEmpty", "No surah found.")}</CommandEmpty>
            <CommandGroup>
              {options.map((chapter) => (
                <CommandItem
                  key={chapter.id}
                  value={`${displayName(chapter)} ${chapter.id}`}
                  onSelect={() => {
                    onChange(chapter.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-[13px]"
                >
                  <Check
                    className={`me-2 size-3.5 ${chapter.id === value ? "opacity-100 text-primary" : "opacity-0"}`}
                  />
                  <span className="text-foreground">{displayName(chapter)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// A page's APPROXIMATE surah, from chapters.json's per-surah page range —
// UI-level constraint only (exact page resolution happens at Apply via
// fetchPageBounds).
const pageSurahRange = (
  chapters: SurahResult[],
  page: number,
): [number, number] => {
  for (const c of chapters) {
    const [start, end] = String(c.pages ?? "").split("-").map(Number);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      if (page >= start && page <= end) return [c.id, c.id];
    }
  }
  return [1, 114];
};

// Generic searchable numeric dropdown (#390 follow-up: page/ayah pickers are
// dropdowns, not free-number inputs). Portaled to `container` when nested in
// a Sheet — same contract as SurahCombobox.
const NumberCombobox = ({
  values,
  value,
  onChange,
  portalContainer,
  placeholder,
  disabled = false,
  format,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  portalContainer: HTMLElement | null;
  placeholder?: string;
  disabled?: boolean;
  // Eastern Arabic numeral policy: display strings come pre-localized.
  format?: (n: number) => string;
}) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const fmt = format ?? ((n: number) => String(n));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label={placeholder}
          disabled={disabled}
          className="fq-section-row w-full rounded-xl border border-border bg-card text-start py-2 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
        >
          <span>{fmt(value)}</span>
          <ChevronsUpDown className="float-end mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        container={portalContainer}
      >
        <Command>
          <CommandInput placeholder={t("recitation.numberSearchPlaceholder", "Search…")} />
          <CommandList>
            <CommandEmpty>{t("recitation.numberEmpty", "No match.")}</CommandEmpty>
            <CommandGroup>
              {values.map((v) => (
                <CommandItem
                  key={v}
                  value={String(v)}
                  onSelect={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-[13px]"
                >
                  <Check
                    className={`me-2 size-3.5 ${v === value ? "opacity-100 text-primary" : "opacity-0"}`}
                  />
                  <span className="text-foreground">{fmt(v)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Module-level memory of the last explicitly-chosen verse point in the
// Stop-At custom picker. The picker unmounts whenever stopPoint leaves
// "custom", which would otherwise wipe the user's selection on every
// re-selection — the exact "always resets to Al-Fatiha" complaint.
const LAST_VERSE_POINT_CACHE: { current: RangePoint | null } = { current: null };

// ---------------------------------------------------------------------------
// CustomRangePicker — the drafted range's custom END point (stopPoint
// "custom"). Inputs are searchable dropdowns, not number fields. The End is
// the USER'S choice and does not track the recited position; its only
// constraint is the drafted Start (mutual push-apart, D6) plus absolute
// bounds.
// ---------------------------------------------------------------------------
const CustomRangePicker = ({
  chapters,
  rangeTo,
  onChange,
  startFloorKey,
  referencePage,
  portalContainer,
  disabled = false,
}: {
  chapters: SurahResult[];
  rangeTo: RangePoint | null;
  onChange: (rangeTo: RangePoint) => void;
  // Ordered verse key of the drafted Start — the ONLY range constraint.
  startFloorKey: string;
  referencePage: number;
  portalContainer: HTMLElement | null;
  disabled?: boolean;
}) => {
  const locale = useLocale();
  const t = useTranslations();

  // Last explicitly-chosen verse point — so switching Page↔Verse doesn't
  // reset the surah/ayah to defaults every time (user-reported: toggling to
  // "Verse" always landed on Al-Fatiha). Also survives across sheet
  // sessions via a module-level cache: the picker remounts when stopPoint
  // leaves "custom", and without this the memory died with the mount.
  const [lastVersePoint, setLastVersePoint] = useState<RangePoint | null>(
    () => LAST_VERSE_POINT_CACHE.current,
  );
  const rememberVersePoint = (p: RangePoint) => {
    LAST_VERSE_POINT_CACHE.current = p;
    setLastVersePoint(p);
  };

  useEffect(() => {
    if (!rangeTo) {
      onChange({ type: "page", page: Math.max(referencePage, 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeTo]);

  const type = rangeTo?.type ?? "page";
  const page = rangeTo?.type === "page" ? Math.max(rangeTo.page, 1) : Math.max(referencePage, 1);
  // In verse mode use the committed value; in page mode fall back to the
  // last-chosen verse (or the start floor's surah — never blind Al-Fatiha).
  const fallbackSurah = (() => {
    const ss = Number(startFloorKey.split(":")[0]);
    return lastVersePoint?.type === "verse"
      ? lastVersePoint.surah
      : ss > 0
        ? ss
        : 1;
  })();
  const fallbackAyah = (() => {
    const sa = Number(startFloorKey.split(":")[1]);
    return lastVersePoint?.type === "verse" ? lastVersePoint.ayah : sa > 0 ? sa : 1;
  })();
  const surah = rangeTo?.type === "verse" ? rangeTo.surah : fallbackSurah;
  const selectedChapter = chapters.find((c) => c.id === surah);
  const ayahCeil = selectedChapter?.verses_count ?? 286;
  const ayah = Math.min(
    rangeTo?.type === "verse" ? rangeTo.ayah : fallbackAyah,
    ayahCeil,
  );

  const [startSurah] = startFloorKey.split(":").map(Number);

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
      <SectionHeader label={t("recitation.rangeTo", "Stop at point")} />

      <div className="grid grid-cols-2 gap-2">
        {RANGE_TYPE_OPTIONS.map(({ value, icon: Icon, labelKey, fallback }) => {
          const isSelected = type === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (value === "verse") rememberVersePoint({ type: "verse", surah, ayah });
                onChange(
                  value === "page"
                    ? { type: "page", page }
                    : { type: "verse", surah, ayah },
                );
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-card text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))]"
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={1.8}
              />
              {t(labelKey, fallback)}
            </button>
          );
        })}
      </div>

      {type === "page" ? (
        <NumberCombobox
          values={Array.from({ length: MUSHAF_LAST_PAGE }, (_, i) => i + 1).filter(
            // Page floor derives from the approx-surah of the drafted start:
            // a page whose surah precedes the start's surah is behind it.
            (p) => {
              const [ps] = pageSurahRange(chapters, p);
              const [ss] = startFloorKey.split(":").map(Number);
              return ps >= ss || ss === 0;
            },
          )}
          value={page}
          onChange={(p) => onChange({ type: "page", page: p })}
          portalContainer={portalContainer}
          placeholder={t("recitation.rangeTypePage", "Page")}
          disabled={disabled}
          format={(n) => toLocaleNumeral(n, locale)}
        />
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <SurahCombobox
              chapters={chapters}
              value={surah}
              minSurah={startSurah}
              onChange={(nextSurah) => {
                const nextChapter = chapters.find((c) => c.id === nextSurah);
                const next = {
                  type: "verse" as const,
                  surah: nextSurah,
                  ayah: Math.min(ayah, nextChapter?.verses_count ?? 1),
                };
                rememberVersePoint(next);
                onChange(next);
              }}
              portalContainer={portalContainer}
              disabled={disabled}
            />
          </div>
          <div className="w-24 shrink-0">
            <NumberCombobox
              values={Array.from({ length: ayahCeil }, (_, i) => i + 1)}
              value={ayah}
              onChange={(a) => {
                const next = { type: "verse" as const, surah, ayah: a };
                rememberVersePoint(next);
                onChange(next);
              }}
              portalContainer={portalContainer}
              placeholder={t("recitation.rangeTypeVerse", "Verse")}
              disabled={disabled}
              format={(n) => toLocaleNumeral(n, locale)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const RepeatStepper = ({
  icon: Icon,
  label,
  value,
  onChange,
  disabled = false,
}: {
  icon?: LucideIcon;
  label: string;
  value: RepeatCount;
  onChange: (value: RepeatCount) => void;
  disabled?: boolean;
}) => (
  <div className="fq-section-row py-2.5 px-4">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <Icon className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
      )}
      <span className="text-[13px] font-medium text-foreground leading-tight truncate">
        {label}
      </span>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        aria-label="Decrease"
        className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
        disabled={disabled}
        onClick={() => onChange(nextRepeatCount(value, -1))}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-[13px] font-semibold tabular-nums text-foreground">
        {value === "infinite" ? "∞" : value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
        disabled={disabled}
        onClick={() => onChange(nextRepeatCount(value, 1))}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  </div>
);

export const RecitationSettingsSheet = () => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const {
    settings,
    updateSettings,
    reciters,
    chapters,
    status,
    currentVerseKey,
    isSettingsOpen,
    closeSettings,
    pageFirstVerseKey,
    recitedPage,
    currentPageNumber,
    play,
    applyStartSeek,
    resolveStartPoint,
    activeOverride,
  } = useRecitation();
  // Popovers rendered inside this Sheet (e.g. ReciterCombobox) must portal
  // here instead of document.body — see components/ui/popover.tsx.
  const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);

  // Draft state (#392): every control edits this local copy; nothing reaches
  // global state or localStorage until Apply/Start. Seeded fresh on each open
  // so unapplied edits never survive a close — discard IS the close behavior.
  const [draft, setDraft] = useState<RecitationSettings>(settings);
  useEffect(() => {
    if (isSettingsOpen) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]);

  // Drafted Start From point (#393 D4, refined per user feedback): the preset
  // captures the position where the CURRENT SESSION started and holds it for
  // the session's lifetime — opening the sheet later does NOT re-derive it
  // (start at page-first verse, play three verses, open the sheet → still
  // shows that first verse). A new seed happens only when a NEW session
  // starts (idle → playing transition).
  const [startPoint, setStartPoint] = useState<StartPoint>({ type: "current-page" });
  const prevStatusRef = useRef<RecitationStatus>(status);
  useEffect(() => {
    const wasIdle = prevStatusRef.current === "idle";
    prevStatusRef.current = status;
    if (wasIdle && status !== "idle") {
      setStartPoint({ type: "current-verse" });
    }
  }, [status]);
  useEffect(() => {
    if (isSettingsOpen && status === "idle") {
      // Idle with no session: fresh per-open derivation is correct here.
      setStartPoint({ type: "current-page" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]);

  const patchDraft = (patch: Partial<RecitationSettings>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  // Reference position for deriving presets and flooring/ceiling the pickers.
  const referenceVerseKey = currentVerseKey ?? pageFirstVerseKey ?? "1:1";
  const [referenceSurahRaw, referenceAyahRaw] = referenceVerseKey
    .split(":")
    .map(Number);
  const referenceSurah = referenceSurahRaw || 1;
  const referenceAyah = referenceAyahRaw || 1;
  const referencePage = recitedPage ?? currentPageNumber ?? 1;

  // --- Mutual push-apart (#393 D6) -----------------------------------------
  // The drafted Start and drafted End constrain each other: whichever side is
  // edited last wins, the opposing side is pushed so start ≤ end always holds.
  // Comparison uses ordered verse keys; a page-type point contributes its
  // APPROXIMATE surah via chapters.json's page range (UI-level constraint
  // only — Apply resolves pages exactly through fetchPageBounds).
  const pageToApproxSurah = (page: number): number => {
    for (const c of chapters) {
      const [start, end] = String(c.pages ?? "").split("-").map(Number);
      if (!Number.isNaN(start) && !Number.isNaN(end) && page >= start && page <= end) {
        return c.id;
      }
    }
    return MUSHAF_LAST_PAGE > 0 ? 114 : 1;
  };
  const startPointAsKey = (): string => {
    switch (startPoint.type) {
      case "current-verse":
        return referenceVerseKey;
      case "current-page":
        return `${pageToApproxSurah(referencePage)}:1`;
      case "surah-start":
        return `${referenceSurah}:1`;
      case "rub-start":
        return `${referenceSurah}:1`; // conservative floor — rub ⊆ surah start half
      case "verse":
        return `${startPoint.surah}:${startPoint.ayah}`;
      case "page":
        return `${pageToApproxSurah(startPoint.page)}:1`;
    }
  };
  const rangeToAsKey = (): string | null => {
    if (draft.stopPoint !== "custom" || !draft.rangeTo) return null;
    return draft.rangeTo.type === "verse"
      ? `${draft.rangeTo.surah}:${draft.rangeTo.ayah}`
      : `${pageToApproxSurah(draft.rangeTo.page)}:286`;
  };
  // Editing START past the drafted END raises END (start wins).
  const pushEndPastStart = (nextStart: StartPoint): StartPoint => {
    setStartPoint(nextStart);
    const endKey = rangeToAsKey();
    if (!endKey) return nextStart;
    const startKey =
      nextStart.type === "verse"
        ? `${nextStart.surah}:${nextStart.ayah}`
        : nextStart.type === "page"
          ? `${pageToApproxSurah(nextStart.page)}:1`
          : startPointAsKeyFor(nextStart);
    if (compareVerseKeys(startKey, endKey) > 0) {
      // Push END to match START's position.
      if (nextStart.type === "verse") {
        patchDraft({ rangeTo: { type: "verse", surah: nextStart.surah, ayah: nextStart.ayah } });
      } else if (nextStart.type === "page") {
        patchDraft({ rangeTo: { type: "verse", surah: pageToApproxSurah(nextStart.page), ayah: 286 } });
      }
    }
    return nextStart;
  };
  // Helper for preset-type starts in pushEndPastStart.
  function startPointAsKeyFor(sp: StartPoint): string {
    switch (sp.type) {
      case "current-verse": return referenceVerseKey;
      case "current-page": return `${pageToApproxSurah(referencePage)}:1`;
      case "surah-start": return `${referenceSurah}:1`;
      case "rub-start": return `${referenceSurah}:1`;
      case "verse": return `${sp.surah}:${sp.ayah}`;
      case "page": return `${pageToApproxSurah(sp.page)}:1`;
    }
  }
  // Editing END before the drafted START lowers START (end wins).
  const pushStartBeforeEnd = (nextRangeTo: RangePoint): void => {
    patchDraft({ rangeTo: nextRangeTo });
    const nextEndKey =
      nextRangeTo.type === "verse"
        ? `${nextRangeTo.surah}:${nextRangeTo.ayah}`
        : `${pageToApproxSurah(nextRangeTo.page)}:286`;
    const curStartKey = startPointAsKey();
    if (compareVerseKeys(curStartKey, nextEndKey) > 0) {
      // Push START to match END's position.
      if (nextRangeTo.type === "verse") {
        setStartPoint({ type: "verse", surah: nextRangeTo.surah, ayah: nextRangeTo.ayah });
      } else {
        setStartPoint({ type: "page", page: nextRangeTo.page });
      }
    }
  };

  const setDraftStopPoint = (stopPoint: StopPoint) => {
    patchDraft({ stopPoint });
  };

  const setStartPreset = (preset: StartPoint["type"]) => {
    switch (preset) {
      case "current-verse":
        pushEndPastStart({ type: "current-verse" });
        break;
      case "current-page":
        pushEndPastStart({ type: "current-page" });
        break;
      case "surah-start":
        pushEndPastStart({ type: "surah-start" });
        break;
      case "rub-start":
        pushEndPastStart({ type: "rub-start" });
        break;
      default:
        break;
    }
  };

  // Apply / Start (#392). Idle → commit + play from the resolved start.
  // Active → commit, then seek to the resolved start when it moved (D3).
  const [isApplying, setIsApplying] = useState(false);
  const isActive = status !== "idle";
  const handleApply = async () => {
    setIsApplying(true);
    try {
      let startVerseKey: string;
      try {
        startVerseKey = await resolveStartPoint(startPoint);
      } catch {
        startVerseKey = pageFirstVerseKey ?? referenceVerseKey;
      }
      updateSettings(draft);
      if (!isActive) {
        closeSettings();
        // Pass the draft as effective settings: play()'s closure still holds
        // the pre-commit values until React re-renders, so a freshly
        // configured stop point / repeat count would silently be ignored.
        play(startVerseKey, undefined, { ...settings, ...draft });
      } else {
        const currentPos = currentVerseKey ?? referenceVerseKey;
        if (compareVerseKeys(startVerseKey, currentPos) !== 0) {
          closeSettings();
          await applyStartSeek(startVerseKey, { ...settings, ...draft });
        } else {
          closeSettings();
        }
      }
    } finally {
      setIsApplying(false);
    }
  };

  useCloseOnBackGesture(isSettingsOpen, closeSettings);

  return (
    <Sheet open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <SheetContent
        ref={setSheetContentEl}
        side={isRTL ? "left" : "right"}
        dir={getLanguageDirection(locale)}
        className="w-full sm:max-w-[408px] gap-0 p-0 flex flex-col"
      >
        <SheetHeader className="relative shrink-0 px-5 pb-3.5 pt-5 border-b border-border/70 text-start">
          <SheetTitle className="text-[15px] font-semibold leading-none text-foreground">
            {t("recitation.settingsTitle", "Recitation settings")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t(
              "recitation.settingsDescription",
              "Choose a reciter and configure playback.",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {activeOverride ? (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-xs text-primary">
              <Headphones className="size-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate font-medium">
                {t("recitation.playingOverride", "Playing")}: {activeOverride.label}
              </span>
            </div>
          ) : null}

          <div>
            <SectionHeader label={t("recitation.reciter", "Reciter")} />
            <ReciterCombobox
              reciters={reciters}
              value={draft.reciterId}
              onChange={(id) => patchDraft({ reciterId: id })}
              portalContainer={sheetContentEl}
              trigger={({ selected, open }) => (
                <ReciterTrigger selected={selected} open={open} />
              )}
            />
          </div>

          {/* Start From (#393) — sits directly above Stop At so the pair
              reads as one range unit. */}
          <div>
            <SectionHeader label={t("recitation.startFrom", "Start from")} />
            <RadioGroup
              value={
                startPoint.type === "verse" || startPoint.type === "page"
                  ? "custom-start"
                  : startPoint.type
              }
              onValueChange={(value) => {
                if (value === "custom-start") {
                  setStartPoint({ type: "verse", surah: referenceSurah, ayah: referenceAyah });
                } else {
                  setStartPreset(value as Exclude<StartPoint["type"], "verse" | "page">);
                }
              }}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "current-verse", labelKey: "recitation.startCurrentVerse", fallback: "Current verse" },
                { value: "current-page", labelKey: "recitation.startCurrentPage", fallback: "Current page" },
                { value: "surah-start", labelKey: "recitation.startSurahStart", fallback: "Start of surah" },
                { value: "rub-start", labelKey: "recitation.startRubStart", fallback: "Start of rub'" },
                { value: "custom-start", labelKey: "recitation.startCustom", fallback: "Custom" },
              ].map(({ value, labelKey, fallback }) => {
                const isSelected =
                  value === "custom-start"
                    ? startPoint.type === "verse" || startPoint.type === "page"
                    : startPoint.type === value;
                return (
                  <label
                    key={value}
                    htmlFor={`start-${value}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))]"
                    )}
                  >
                    <RadioGroupItem value={value} id={`start-${value}`} className="sr-only" />
                    <span className="truncate">{t(labelKey, fallback)}</span>
                  </label>
                );
              })}
            </RadioGroup>

            {startPoint.type === "verse" || startPoint.type === "page" ? (
              <div className="mt-3 rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {RANGE_TYPE_OPTIONS.map(({ value, icon: Icon, labelKey, fallback }) => {
                    const isSelected = startPoint.type === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          pushEndPastStart(
                            value === "page"
                              ? { type: "page", page: referencePage }
                              : { type: "verse", surah: referenceSurah, ayah: referenceAyah },
                          )
                        }
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-card text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                          strokeWidth={1.8}
                        />
                        {t(labelKey, fallback)}
                      </button>
                    );
                  })}
                </div>

                {startPoint.type === "page" ? (
                  <NumberCombobox
                    values={Array.from({ length: MUSHAF_LAST_PAGE }, (_, i) => i + 1)}
                    value={Math.max(startPoint.page, 1)}
                    onChange={(p) => pushEndPastStart({ type: "page", page: p })}
                    portalContainer={sheetContentEl}
                    placeholder={t("recitation.rangeTypePage", "Page")}
                    format={(n) => toLocaleNumeral(n, locale)}
                  />
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SurahCombobox
                        chapters={chapters}
                        value={startPoint.surah}
                        onChange={(surah) => {
                          const chapter = chapters.find((c) => c.id === surah);
                          const ayah = Math.min(startPoint.ayah, chapter?.verses_count ?? 1);
                          pushEndPastStart({ type: "verse", surah, ayah });
                        }}
                        portalContainer={sheetContentEl}
                      />
                    </div>
                    <div className="w-24 shrink-0">
                      <NumberCombobox
                        values={
                          Array.from(
                            { length: chapters.find((c) => c.id === startPoint.surah)?.verses_count ?? 286 },
                            (_, i) => i + 1,
                          )
                        }
                        value={startPoint.ayah}
                        onChange={(a) =>
                          pushEndPastStart({ type: "verse", surah: startPoint.surah, ayah: a })
                        }
                        portalContainer={sheetContentEl}
                        placeholder={t("recitation.rangeTypeVerse", "Verse")}
                        format={(n) => toLocaleNumeral(n, locale)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div>
            <SectionHeader label={t("recitation.stopPoint", "Stop at")} />
            <RadioGroup
              value={draft.stopPoint}
              onValueChange={(value) => setDraftStopPoint(value as StopPoint)}
              disabled={activeOverride != null}
              className="grid grid-cols-2 gap-2"
            >
              {STOP_POINT_OPTIONS.map(({ value, icon: Icon, labelKey, fallback }) => {
                const isSelected = draft.stopPoint === value;
                const isDisabled = activeOverride != null;
                return (
                  <label
                    key={value}
                    htmlFor={`stop-${value}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] transition-all",
                      isDisabled
                        ? "cursor-not-allowed opacity-50 border-border bg-card"
                        : "cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-[hsl(var(--well)/var(--well-alpha))]"
                    )}
                  >
                    <RadioGroupItem value={value} id={`stop-${value}`} className="sr-only" />
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="truncate">{t(labelKey, fallback)}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {draft.stopPoint === "custom" ? (
            <CustomRangePicker
              chapters={chapters}
              rangeTo={draft.rangeTo}
              onChange={pushStartBeforeEnd}
              startFloorKey={startPointAsKey()}
              referencePage={referencePage}
              portalContainer={sheetContentEl}
              disabled={activeOverride != null}
            />
          ) : null}

          <div>
            <SectionHeader label={t("recitation.repeatSectionLabel", "Repeats & Speed")} />
            <div className="fq-section-group">
              <RepeatStepper
                icon={Repeat1}
                label={t("recitation.repeatEachAyah", "Repeat each ayah")}
                value={draft.perAyahRepeatCount}
                onChange={(value) => patchDraft({ perAyahRepeatCount: value })}
              />
              {draft.stopPoint !== "none" ? (
                <RepeatStepper
                  icon={Repeat2}
                  label={t("recitation.repeatRange", "Repeat whole range")}
                  value={draft.rangeRepeatCount}
                  onChange={(value) => patchDraft({ rangeRepeatCount: value })}
                  disabled={activeOverride != null}
                />
              ) : null}

              <div className="fq-section-row py-2.5 px-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Gauge className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium text-foreground leading-tight truncate">
                    {t("recitation.playbackSpeed", "Playback speed")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease speed"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      patchDraft({
                        playbackSpeed: Math.max(
                          PLAYBACK_SPEED_MIN,
                          Number((draft.playbackSpeed - PLAYBACK_SPEED_STEP).toFixed(2)),
                        ),
                      })
                    }
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-10 text-center text-[13px] font-semibold tabular-nums text-foreground">
                    {draft.playbackSpeed}x
                  </span>
                  <button
                    type="button"
                    aria-label="Increase speed"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      patchDraft({
                        playbackSpeed: Math.min(
                          PLAYBACK_SPEED_MAX,
                          Number((draft.playbackSpeed + PLAYBACK_SPEED_STEP).toFixed(2)),
                        ),
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="fq-section-row py-2.5 px-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Timer className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium text-foreground leading-tight truncate">
                    {t("recitation.pauseBetweenRepeats", "Pause between repeats")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease pause"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      patchDraft({
                        pauseBetweenRepeatsMs: Math.max(
                          0,
                          draft.pauseBetweenRepeatsMs - PAUSE_BETWEEN_REPEATS_STEP_MS,
                        ),
                      })
                    }
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-10 text-center text-[13px] font-semibold tabular-nums text-foreground">
                    {draft.pauseBetweenRepeatsMs / 1000}s
                  </span>
                  <button
                    type="button"
                    aria-label="Increase pause"
                    className="size-7 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                    onClick={() =>
                      patchDraft({
                        pauseBetweenRepeatsMs: Math.min(
                          PAUSE_BETWEEN_REPEATS_MAX_MS,
                          draft.pauseBetweenRepeatsMs + PAUSE_BETWEEN_REPEATS_STEP_MS,
                        ),
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Closes the inventory with the terminal identity mark */}
          <div className="flex justify-center pt-2">
            <span className="fq-rule-mark !inline-block" aria-hidden="true" />
          </div>
        </div>

        {/* Sticky footer action bar (#392) — outside the scroll area. Idle
            starts a session from the drafted start; active commits the draft
            and seeks to the drafted start when it moved. Compact height per
            user feedback — full-width primary buttons here read oversized. */}
        <div className="shrink-0 border-t border-border/70 bg-card px-5 py-2.5 flex justify-end">
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || (isActive && activeOverride != null)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Play className="size-3.5" strokeWidth={1.8} />
            {isActive
              ? t("recitation.applyChanges", "Apply changes")
              : t("recitation.startRecitation", "Start recitation")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

