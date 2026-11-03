"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Headphones,
  Brain,
  RotateCcw,
  Lock,
  Sparkles,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { usePlans } from "@hooks/use-plans";
import { fetchChapters } from "@/app/utils/recitation-api";
import type { SurahResult } from "@/app/types";
import {
  PLAN_ACTIVITIES,
  type PlanActivity,
  type UserPlanParams,
} from "@/app/constants/plans";
import type { PlanPreset } from "@/app/constants/plan-presets";
import { PLAN_ACTIVITY_UI, PLAN_TEMPLATE_UI } from "@/app/constants/plan-ui";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import {
  computeCadenceEstimate,
  computeRangeTotalUnits,
  verseOrdinalToSurahAyah,
  type CustomCadenceType,
  type CustomWirdFormMode,
} from "@/app/lib/plans/custom-wird-estimate";
import {
  bindDedicatedReminderSafe,
  buildCustomCreateBody,
  buildCustomPatchBody,
  type CustomWirdFormState,
} from "@/app/lib/plans/custom-wird-form-helpers";
import {
  computeCustomWirdSummarySentence,
  suggestWirdName,
} from "@/app/lib/plans/custom-wird-summary";
import { QuantityStepper } from "./QuantityStepper";
import { JuzRangeSlider } from "./JuzRangeSlider";
import { StartPointPicker } from "./StartPointPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { NumberCombobox } from "@/components/ui/number-combobox";

const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getTodayString = () => formatLocalDate(new Date());

const getDefaultDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return formatLocalDate(d);
};

const getDatePlusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

const ACTIVITY_ICONS: Record<PlanActivity, typeof BookOpen> = {
  read: BookOpen,
  listen: Headphones,
  memorize: Brain,
  review: RotateCcw,
};

type Props = {
  existingPlan?: UserPlanListItem;
  preset?: PlanPreset | null;
  onDone: () => void;
};

const SurahCombobox = ({
  value,
  onChange,
  chapters,
  portalContainer,
  disabled = false,
  label,
}: {
  value: number;
  onChange: (id: number) => void;
  chapters: SurahResult[];
  portalContainer?: HTMLElement | null;
  disabled?: boolean;
  label: string;
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const selectedChapter = chapters.find((c) => c.id === value);
  const surahName = (c: SurahResult) => (locale === "ar" ? c.name_arabic : c.name_simple);

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className="fq-focus-ring min-h-[44px] flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
          >
            {selectedChapter ? (
              <div className="flex items-center min-w-0 flex-1 me-1">
                <span className="truncate font-medium">
                  {surahName(selectedChapter)}
                </span>
                <span className="text-[11px] text-muted-foreground ms-1 flex-none">
                  ({toLocaleNumeral(selectedChapter.id, locale)})
                </span>
              </div>
            ) : (
              <span className="truncate">
                {t("plans.startPoint.chooseSurah", "Choose a surah")}
              </span>
            )}
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60 flex-none" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[220px] max-w-[90vw] p-0"
          align="start"
          container={portalContainer}
        >
          <Command>
            <CommandInput
              placeholder={t("plans.startPoint.searchSurahs", "Search surahs…")}
            />
            <CommandList className="fq-scroll-nice max-h-60">
              <CommandEmpty>
                {t("plans.startPoint.noSurahFound", "No surah found.")}
              </CommandEmpty>
              <CommandGroup>
                {chapters.map((chapter) => {
                  const isSelected = value === chapter.id;
                  return (
                    <CommandItem
                      key={chapter.id}
                      value={`${surahName(chapter)} ${chapter.id} ${chapter.name_arabic} ${chapter.name_simple}`}
                      onSelect={() => {
                        onChange(chapter.id);
                        setOpen(false);
                      }}
                      className="min-h-[44px] cursor-pointer text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Check
                          className={cn(
                            "size-3.5 flex-none",
                            isSelected ? "text-primary opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-medium text-foreground truncate">
                          {surahName(chapter)}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex-none">
                          ({toLocaleNumeral(chapter.id, locale)})
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-none shrink-0">
                        {toLocaleNumeral(chapter.verses_count, locale)}{" "}
                        {t("plans.verses", "verses")}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const CustomWirdForm = ({ existingPlan, preset, onDone }: Props) => {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { enrollCustom, updateCustom, updateParams } = usePlans();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const isEdit = existingPlan !== undefined;
  const isLegacyPreset = Boolean(existingPlan && existingPlan.template_key !== "custom");
  const defaultPresetName =
    isLegacyPreset && existingPlan
      ? t(
          PLAN_TEMPLATE_UI[existingPlan.template_key]?.labelKey ?? "plans.templates.dailyWird.label",
          "Daily wird"
        )
      : "";
  const presetName = preset ? t(preset.titleKey, preset.defaultTitle) : "";
  const hasProgress = Boolean(existingPlan?.has_progress);
  const existingDef = existingPlan?.definition;

  const { data: chapters = [] } = useQuery({
    queryKey: ["quran-chapters"],
    queryFn: fetchChapters,
    staleTime: Infinity,
  });

  // Name
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(
    (isEdit && Boolean(existingPlan?.name)) || Boolean(preset)
  );
  const [name, setName] = useState(existingPlan?.name || presetName || defaultPresetName);

  // Activity (permanently frozen on edit)
  const [activity, setActivity] = useState<PlanActivity>(() => {
    if (existingDef?.activity) return existingDef.activity;
    if (preset) return preset.payload.activity;
    if (existingPlan?.template_key === "listening-wird") return "listen";
    if (existingPlan?.template_key === "memorizing-wird") return "memorize";
    if (existingPlan?.template_key === "reviewing-wird") return "review";
    return "read";
  });

  // Range Mode
  const initialRangeMode = useMemo<CustomWirdFormMode>(() => {
    if (existingDef) {
      if (existingDef.unit === "verse") return "verse";
      if (existingDef.rangeStart === 1 && existingDef.rangeEnd === 604) return "mushaf";
      return "page";
    }
    if (preset) {
      if (preset.payload.range.mode === "surah") return "surah";
      if (preset.payload.range.mode === "juz") return "juz";
      if (preset.payload.range.mode === "verse") return "verse";
      if (
        preset.payload.range.mode === "page" &&
        preset.payload.range.startPage === 1 &&
        preset.payload.range.endPage === 604
      ) {
        return "mushaf";
      }
      return "page";
    }
    return "mushaf";
  }, [existingDef, preset]);

  const [rangeMode, setRangeMode] = useState<CustomWirdFormMode>(initialRangeMode);

  // Range values
  const [startSurah, setStartSurah] = useState(() =>
    preset?.payload.range.mode === "surah" ? preset.payload.range.startSurah : 1
  );
  const [endSurah, setEndSurah] = useState(() =>
    preset?.payload.range.mode === "surah"
      ? preset.payload.range.endSurah ?? preset.payload.range.startSurah
      : 1
  );
  const [startJuz, setStartJuz] = useState(1);
  const [endJuz, setEndJuz] = useState(30);
  const [startPage, setStartPage] = useState<number>(() => {
    if (existingDef && existingDef.unit === "page") return existingDef.rangeStart;
    if (existingPlan?.params?.startPage) return existingPlan.params.startPage;
    if (preset?.payload.range.mode === "page") return preset.payload.range.startPage ?? 1;
    return 1;
  });
  const [endPage, setEndPage] = useState(() => {
    if (existingDef && existingDef.unit === "page") return existingDef.rangeEnd;
    if (preset?.payload.range.mode === "page") return preset.payload.range.endPage ?? 604;
    return 604;
  });
  const [startVerse, setStartVerse] = useState({ surah: 1, ayah: 1 });
  const [endVerse, setEndVerse] = useState({ surah: 1, ayah: 7 });

  // Hydrate verse range from global ordinals once chapters are loaded
  useEffect(() => {
    if (existingDef && existingDef.unit === "verse" && chapters.length > 0) {
      setStartVerse(verseOrdinalToSurahAyah(existingDef.rangeStart, chapters));
      setEndVerse(verseOrdinalToSurahAyah(existingDef.rangeEnd, chapters));
    }
  }, [existingDef, chapters]);

  // Auto-suggest wird name if user has not manually edited it
  useEffect(() => {
    if (!isNameManuallyEdited && !isEdit) {
      const suggested = suggestWirdName({
        activity,
        rangeMode,
        startSurah,
        endSurah,
        startJuz,
        endJuz,
        startPage,
        endPage,
        locale,
        chapters,
      });
      setName(suggested);
    }
  }, [
    isNameManuallyEdited,
    isEdit,
    activity,
    rangeMode,
    startSurah,
    endSurah,
    startJuz,
    endJuz,
    startPage,
    endPage,
    locale,
    chapters,
  ]);

  // Cadence Tabs: daily | weekly | deadline
  type CadenceTab = "daily" | "weekly" | "deadline";
  const initialCadenceTab: CadenceTab = useMemo(() => {
    if (existingDef?.cadence.type === "weekly") return "weekly";
    if (existingDef?.cadence.type === "deadline") return "deadline";
    if (preset?.payload.cadence.type === "weekly") return "weekly";
    if (preset?.payload.cadence.type === "deadline") return "deadline";
    return "daily";
  }, [existingDef, preset]);

  const [cadenceTab, setCadenceTab] = useState<CadenceTab>(initialCadenceTab);
  const [dailySubtype, setDailySubtype] = useState<"fullRange" | "pace">(() => {
    if (existingDef?.cadence.type === "daily") return "fullRange";
    if (preset?.payload.cadence.type === "daily") return "fullRange";
    return "pace";
  });

  const cadenceType: CustomCadenceType = useMemo(() => {
    if (cadenceTab === "deadline") return "deadline";
    if (cadenceTab === "weekly") return "weekly";
    if (dailySubtype === "fullRange") return "daily";
    return "pace";
  }, [cadenceTab, dailySubtype]);

  const pacePeriod: "day" | "week" = useMemo(() => {
    if (existingDef?.cadence.type === "pace") {
      const upd = existingDef.cadence.unitsPerDay;
      if (upd !== 0.5 && !Number.isInteger(upd)) {
        return "week";
      }
    }
    return "day";
  }, [existingDef]);
  const [paceAmount, setPaceAmount] = useState<number>(() => {
    if (existingDef?.cadence.type === "pace") {
      const upd = existingDef.cadence.unitsPerDay;
      if (upd === 0.5) return 0.5;
      if (!Number.isInteger(upd)) return Math.max(1, Math.round(upd * 7));
      return upd;
    }
    if (existingPlan?.params?.quantities) {
      const q = Object.values(existingPlan.params.quantities)[0];
      if (typeof q === "number") return q;
      if (typeof q === "object" && q && "amount" in q) return q.amount;
    }
    if (preset?.payload.cadence.type === "pace") {
      return preset.payload.cadence.amount ?? 1;
    }
    return 1;
  });
  const [deadlineEndDate, setDeadlineEndDate] = useState<string>(
    existingDef?.cadence.type === "deadline"
      ? existingDef.cadence.endDate
      : getDefaultDeadline()
  );
  const [repetitions, setRepetitions] = useState<number>(
    existingDef?.cadence.type === "deadline" ? existingDef.cadence.repetitions ?? 1 : 1
  );
  // Weekly recurrence due weekday (0 = Sunday … 6 = Saturday). Default Friday.
  const [weekday, setWeekday] = useState<number>(() => {
    if (existingDef?.cadence.type === "weekly") return existingDef.cadence.weekday;
    if (preset?.payload.cadence.type === "weekly") return preset.payload.cadence.weekday ?? 5;
    return 5;
  });
  // Whether to repeat the khatma upon completion when range is whole mushaf
  const [repeat, setRepeat] = useState<boolean>(() => {
    if (existingDef?.cadence.type === "pace") {
      return existingDef.cadence.repeat === true;
    }
    if (preset?.payload.cadence.type === "pace" && preset.payload.cadence.repeat !== undefined) {
      return preset.payload.cadence.repeat;
    }
    return false;
  });

  const [error, setError] = useState<string | null>(null);

  // Localized short weekday names in Sun–Sat order (0–6), resolved once per locale.
  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from(
      { length: 7 },
      (_, i) => fmt.format(new Date(Date.UTC(2026, 0, 4 + i)))
    );
  }, [locale]);

  // Silently adjust default pace if switching to verse mode
  const handleRangeModeChange = (newMode: CustomWirdFormMode) => {
    setRangeMode(newMode);
    if (newMode === "verse") {
      const wasUntouchedDefault = paceAmount === 1;
      if (wasUntouchedDefault) {
        setPaceAmount(5);
      }
    }
    if (newMode === "mushaf" && dailySubtype === "fullRange" && !existingDef) {
      setDailySubtype("pace");
    }
  };

  // Chapter count lookups for verse ranges
  const startChapter = useMemo(
    () => chapters.find((c) => c.id === startVerse.surah) ?? null,
    [chapters, startVerse.surah]
  );
  const endChapter = useMemo(
    () => chapters.find((c) => c.id === endVerse.surah) ?? null,
    [chapters, endVerse.surah]
  );

  // Live total units & estimate
  const { totalUnits, unit } = useMemo(() => {
    return computeRangeTotalUnits(
      rangeMode,
      {
        startPage,
        endPage,
        startJuz,
        endJuz,
        startSurah,
        endSurah,
        startVerse,
        endVerse,
      },
      chapters
    );
  }, [
    rangeMode,
    startPage,
    endPage,
    startJuz,
    endJuz,
    startSurah,
    endSurah,
    startVerse,
    endVerse,
    chapters,
  ]);

  // Keep paceAmount within its content-bound max when the range shrinks or the
  // period switches from week -> day (both lower the cap); a stale value here
  // would submit a pace the wird can never actually need (#629).
  useEffect(() => {
    const paceMax = totalUnits;
    if (paceAmount > paceMax) {
      setPaceAmount(paceMax);
    }
  }, [totalUnits, paceAmount]);

  const estimate = useMemo(() => {
    return computeCadenceEstimate({
      totalUnits,
      unit,
      cadenceType,
      pacePeriod,
      paceAmount,
      startDate: getTodayString(),
      endDate: deadlineEndDate,
      repetitions: activity === "memorize" ? 1 : repetitions,
      weekday,
    });
  }, [
    totalUnits,
    unit,
    cadenceType,
    pacePeriod,
    paceAmount,
    deadlineEndDate,
    activity,
    repetitions,
    weekday,
  ]);

  const summarySentence = useMemo(() => {
    return computeCustomWirdSummarySentence({
      activity,
      unit,
      rangeMode,
      range: {
        startSurah,
        endSurah,
        startJuz,
        endJuz,
        startPage,
        endPage,
        startVerse,
        endVerse,
      },
      cadence: {
        type: cadenceType,
        amount: paceAmount,
        pacePeriod,
        repeat,
        endDate: deadlineEndDate,
        weekday,
        repetitions,
      },
      estimatedDays:
        estimate.estimatedDays ??
        (estimate.type === "days" ? estimate.numericValue : undefined),
      locale,
      chapters,
    });
  }, [
    activity,
    unit,
    rangeMode,
    startSurah,
    endSurah,
    startJuz,
    endJuz,
    startPage,
    endPage,
    startVerse,
    endVerse,
    cadenceType,
    paceAmount,
    pacePeriod,
    repeat,
    deadlineEndDate,
    weekday,
    repetitions,
    estimate,
    locale,
    chapters,
  ]);

  const isRangeFrozen = isEdit && hasProgress;
  const isVerseLocked = isEdit && existingDef?.unit === "page";
  const isPageLocked = isEdit && existingDef?.unit === "verse";

  const isValid =
    name.trim().length >= 1 &&
    name.trim().length <= 100 &&
    (cadenceType !== "deadline" || Boolean(deadlineEndDate));

  const isPending =
    enrollCustom.isPending || updateCustom.isPending || updateParams.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!isValid) return;

    const state: CustomWirdFormState = {
      name,
      activity,
      rangeMode,
      startSurah,
      endSurah,
      startJuz,
      endJuz,
      startPage,
      endPage,
      startVerse,
      endVerse,
      cadenceType,
      pacePeriod,
      paceAmount,
      deadlineEndDate,
      repetitions,
      weekday,
      repeat,
    };

    if (isEdit) {
      if (isLegacyPreset && existingPlan) {
        const trackKey =
          existingPlan.template_key === "listening-wird"
            ? "listening"
            : existingPlan.template_key === "memorizing-wird"
              ? "memorizing"
              : existingPlan.template_key === "reviewing-wird"
                ? "reviewing"
                : "reading";
        const effectiveStartPage = hasProgress ? existingPlan.params.startPage : startPage;
        const params: UserPlanParams = {
          quantities: { [trackKey]: paceAmount },
          trackUnits: existingPlan.params.trackUnits ?? { [trackKey]: "page" },
          ...(effectiveStartPage !== undefined && effectiveStartPage !== 1
            ? { startPage: effectiveStartPage }
            : {}),
        };
        const success = await updateParams.mutateAsync({
          planId: existingPlan.id,
          params,
        });
        if (success) onDone();
        else setError(t("plans.enrollError", "Something went wrong. Try again."));
        return;
      }

      const patchBody = buildCustomPatchBody(state, hasProgress);
      const result = await updateCustom.mutateAsync({
        planId: existingPlan.id,
        ...patchBody,
      });
      if (result.success) onDone();
      else setError(result.errorMessage ?? t("plans.enrollError", "Something went wrong. Try again."));
    } else {
      const createBody = buildCustomCreateBody(state);
      const result = await enrollCustom.mutateAsync(createBody);
      if (result.plan) {
        if (preset?.defaultReminderTime && result.plan.id) {
          await bindDedicatedReminderSafe({
            planId: result.plan.id,
            time: preset.defaultReminderTime,
            locale,
          });
          queryClient.invalidateQueries({ queryKey: ["daily-wird-reminder"] });
        }
        onDone();
      } else {
        setError(result.errorMessage ?? t("plans.enrollError", "Something went wrong. Try again."));
      }
    }
  };

  const rangeModes: { key: CustomWirdFormMode; labelKey: string; defaultLabel: string }[] = [
    {
      key: "mushaf",
      labelKey: "plans.custom.rangeMode.wholeMushaf",
      defaultLabel: "Whole Quran",
    },
    { key: "surah", labelKey: "plans.custom.rangeMode.surah", defaultLabel: "By surah" },
    { key: "juz", labelKey: "plans.custom.rangeMode.juz", defaultLabel: "By juz" },
    { key: "page", labelKey: "plans.custom.rangeMode.page", defaultLabel: "By page" },
    { key: "verse", labelKey: "plans.custom.rangeMode.verse", defaultLabel: "By verse" },
  ];

  return (
    <div ref={setContainerEl} className="flex flex-col gap-6">
      {/* 1. Name Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            {t("plans.custom.nameLabel", "Wird name")}
          </label>
          {isNameManuallyEdited && !isEdit ? (
            <button
              type="button"
              onClick={() => setIsNameManuallyEdited(false)}
              className="text-[11px] font-medium text-primary hover:underline transition-colors"
            >
              {t("plans.custom.resetSuggestedName", "Reset suggested name")}
            </button>
          ) : null}
        </div>
        <input
          type="text"
          maxLength={100}
          value={name}
          onChange={(e) => {
            setIsNameManuallyEdited(true);
            setName(e.target.value);
          }}
          placeholder={t(
            "plans.custom.namePlaceholder",
            "e.g. Surah Al-Baqarah memorization"
          )}
          className="fq-focus-ring min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* 2. Activity Picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            {t("plans.custom.activityLabel", "Activity")}
          </label>
          {isEdit ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" />
              <span>{t(PLAN_ACTIVITY_UI[activity].labelKey, PLAN_ACTIVITY_UI[activity].defaultLabel)}</span>
            </span>
          ) : null}
        </div>
        <div
          role="radiogroup"
          aria-label={t("plans.custom.activityLabel", "Activity")}
          className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border"
        >
          {PLAN_ACTIVITIES.map((act) => {
            const isSelected = activity === act;
            const Icon = ACTIVITY_ICONS[act];
            return (
              <button
                key={act}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isEdit}
                onClick={() => setActivity(act)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-h-[44px] py-2 px-1 rounded-xl transition-all duration-150 fq-focus-ring text-xs",
                  isSelected
                    ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                  isEdit && "opacity-70 cursor-not-allowed"
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} />
                <span className="text-[11px]">
                  {t(PLAN_ACTIVITY_UI[act].labelKey, PLAN_ACTIVITY_UI[act].defaultLabel)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Range Section ("What") */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {t("plans.custom.rangeLabel", "Target range")}
          </span>
          <span className="text-xs font-medium text-primary">
            {unit === "verse"
              ? tIntl("plans.custom.versesCount", {
                  count: totalUnits,
                  n: toLocaleNumeral(totalUnits, locale),
                })
              : tIntl("plans.custom.pagesCount", {
                  count: totalUnits,
                  n: toLocaleNumeral(totalUnits, locale),
                })}
          </span>
        </div>

        {/* Range frozen banner if progress logged */}
        {isRangeFrozen ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Lock className="size-3.5 flex-none" />
            <span>
              {t(
                "plans.custom.rangeFrozen",
                "Target range is locked because progress has been logged"
              )}
            </span>
          </div>
        ) : null}

        {/* Range mode segmented tabs */}
        <div
          role="radiogroup"
          aria-label={t("plans.custom.rangeLabel", "Target range")}
          className="flex p-1 rounded-xl bg-muted/60 border border-border overflow-x-auto fq-scroll-nice"
        >
          {rangeModes.map((mode) => {
            const isSelected = rangeMode === mode.key;
            const isDisabled =
              isRangeFrozen ||
              (mode.key === "verse" && isVerseLocked) ||
              (mode.key !== "verse" && isPageLocked);

            return (
              <button
                key={mode.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isDisabled}
                onClick={() => handleRangeModeChange(mode.key)}
                className={cn(
                  "flex-1 min-h-[44px] whitespace-nowrap px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 fq-focus-ring flex items-center justify-center",
                  isSelected
                    ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                  isDisabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {t(mode.labelKey, mode.defaultLabel)}
              </button>
            );
          })}
        </div>

        {/* Mode-specific controls */}
        {rangeMode === "mushaf" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {t("plans.custom.rangeMode.wholeMushaf", "Whole Quran")}
                </span>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {toLocaleNumeral(startPage, locale)} – {toLocaleNumeral(604, locale)}{" "}
                {t("plans.pages", "pages")}
              </span>
            </div>

            <StartPointPicker
              value={startPage}
              onChange={setStartPage}
              portalContainer={containerEl}
              disabled={isRangeFrozen}
            />
          </div>
        ) : null}

        {rangeMode === "surah" ? (
          <div className="flex items-center gap-3">
            <SurahCombobox
              label={t("plans.custom.fromSurah", "From surah")}
              value={startSurah}
              disabled={isRangeFrozen}
              chapters={chapters}
              portalContainer={containerEl}
              onChange={(s) => {
                setStartSurah(s);
                if (s > endSurah) setEndSurah(s);
              }}
            />
            <SurahCombobox
              label={t("plans.custom.toSurah", "To surah")}
              value={endSurah}
              disabled={isRangeFrozen}
              chapters={chapters}
              portalContainer={containerEl}
              onChange={(e) => {
                setEndSurah(e);
                if (e < startSurah) setStartSurah(e);
              }}
            />
          </div>
        ) : null}

        {rangeMode === "juz" ? (
          <div className="pt-1">
            <JuzRangeSlider
              from={startJuz}
              to={endJuz}
              disabled={isRangeFrozen}
              onChange={(from, to) => {
                setStartJuz(from);
                setEndJuz(to);
              }}
            />
          </div>
        ) : null}

        {rangeMode === "page" ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberCombobox
              label={t("plans.custom.fromPage", "From page")}
              value={startPage}
              min={1}
              max={604}
              prefix={t("plans.startPoint.pagePrefix", "Page")}
              disabled={isRangeFrozen}
              portalContainer={containerEl}
              searchPlaceholder={t("plans.startPoint.searchPages", "Search pages…")}
              emptyText={t("plans.startPoint.noPageFound", "No match.")}
              onChange={(val) => {
                setStartPage(val);
                if (val > endPage) setEndPage(val);
              }}
            />
            <NumberCombobox
              label={t("plans.custom.toPage", "To page")}
              value={endPage}
              min={startPage}
              max={604}
              prefix={t("plans.startPoint.pagePrefix", "Page")}
              disabled={isRangeFrozen}
              portalContainer={containerEl}
              searchPlaceholder={t("plans.startPoint.searchPages", "Search pages…")}
              emptyText={t("plans.startPoint.noPageFound", "No match.")}
              onChange={(val) => {
                setEndPage(val);
              }}
            />
          </div>
        ) : null}

        {rangeMode === "verse" ? (
          <div className="flex flex-col gap-3">
            {/* Start Verse */}
            <div className="flex items-center gap-2">
              <SurahCombobox
                label={t("plans.custom.fromSurah", "From surah")}
                value={startVerse.surah}
                disabled={isRangeFrozen}
                chapters={chapters}
                portalContainer={containerEl}
                onChange={(s) => {
                  setStartVerse({ surah: s, ayah: 1 });
                  if (s > endVerse.surah) {
                    setEndVerse({ surah: s, ayah: 1 });
                  }
                }}
              />
              <div className="w-24 flex-none">
                <NumberCombobox
                  label={t("plans.custom.fromVerse", "From verse")}
                  value={startVerse.ayah}
                  min={1}
                  max={startChapter?.verses_count ?? 286}
                  prefix={t("plans.custom.versePrefix", "Ayah")}
                  disabled={isRangeFrozen}
                  portalContainer={containerEl}
                  searchPlaceholder={t("plans.startPoint.searchPages", "Search…")}
                  emptyText={t("plans.startPoint.noPageFound", "No match.")}
                  onChange={(val) => {
                    setStartVerse((prev) => ({ ...prev, ayah: val }));
                    if (startVerse.surah === endVerse.surah && val > endVerse.ayah) {
                      setEndVerse((prev) => ({ ...prev, ayah: val }));
                    }
                  }}
                />
              </div>
            </div>

            {/* End Verse */}
            <div className="flex items-center gap-2">
              <SurahCombobox
                label={t("plans.custom.toSurah", "To surah")}
                value={endVerse.surah}
                disabled={isRangeFrozen}
                chapters={chapters}
                portalContainer={containerEl}
                onChange={(s) => {
                  const nextSurah = Math.max(s, startVerse.surah);
                  setEndVerse({
                    surah: nextSurah,
                    ayah: nextSurah === startVerse.surah ? Math.max(1, startVerse.ayah) : 1,
                  });
                }}
              />
              <div className="w-24 flex-none">
                <NumberCombobox
                  label={t("plans.custom.toVerse", "To verse")}
                  value={endVerse.ayah}
                  min={startVerse.surah === endVerse.surah ? startVerse.ayah : 1}
                  max={endChapter?.verses_count ?? 286}
                  prefix={t("plans.custom.versePrefix", "Ayah")}
                  disabled={isRangeFrozen}
                  portalContainer={containerEl}
                  searchPlaceholder={t("plans.startPoint.searchPages", "Search…")}
                  emptyText={t("plans.startPoint.noPageFound", "No match.")}
                  onChange={(val) => {
                    setEndVerse((prev) => ({ ...prev, ayah: val }));
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 4. Cadence Section ("How") */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4">
        <label className="text-xs font-semibold text-foreground">
          {t("plans.custom.cadenceLabel", "Schedule")}
        </label>

        {/* 3 Mental Model Tabs: Daily | Weekly | Target Date */}
        <div
          role="radiogroup"
          aria-label={t("plans.custom.cadenceLabel", "Schedule")}
          className="flex p-1 rounded-xl bg-muted/60 border border-border"
        >
          <button
            type="button"
            role="radio"
            aria-checked={cadenceTab === "daily"}
            onClick={() => setCadenceTab("daily")}
            className={cn(
              "flex-1 min-h-[44px] py-1.5 rounded-lg text-xs font-medium transition-all duration-150 fq-focus-ring flex items-center justify-center",
              cadenceTab === "daily"
                ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("plans.custom.cadenceTabs.daily", "Daily")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={cadenceTab === "weekly"}
            onClick={() => setCadenceTab("weekly")}
            className={cn(
              "flex-1 min-h-[44px] py-1.5 rounded-lg text-xs font-medium transition-all duration-150 fq-focus-ring flex items-center justify-center",
              cadenceTab === "weekly"
                ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("plans.custom.cadenceTabs.weekly", "Weekly")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={cadenceTab === "deadline"}
            onClick={() => setCadenceTab("deadline")}
            className={cn(
              "flex-1 min-h-[44px] py-1.5 rounded-lg text-xs font-medium transition-all duration-150 fq-focus-ring flex items-center justify-center",
              cadenceTab === "deadline"
                ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("plans.custom.cadenceTabs.deadline", "By deadline")}
          </button>
        </div>

        {/* Sub-form: Daily Tab */}
        {cadenceTab === "daily" ? (
          <div className="flex flex-col gap-3.5 pt-1">
            {rangeMode !== "mushaf" ? (
              <div className="flex justify-center gap-1 rounded-full bg-muted/60 p-1 max-w-[280px] mx-auto w-full">
                <button
                  type="button"
                  aria-pressed={dailySubtype === "fullRange"}
                  onClick={() => setDailySubtype("fullRange")}
                  className={cn(
                    "flex-1 min-h-[40px] flex items-center justify-center rounded-full py-1 text-xs font-medium transition-colors text-center px-2",
                    dailySubtype === "fullRange"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("plans.custom.dailySubtype.fullRange", "Full range daily")}
                </button>
                <button
                  type="button"
                  aria-pressed={dailySubtype === "pace"}
                  onClick={() => setDailySubtype("pace")}
                  className={cn(
                    "flex-1 min-h-[40px] flex items-center justify-center rounded-full py-1 text-xs font-medium transition-colors text-center px-2",
                    dailySubtype === "pace"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("plans.custom.dailySubtype.pace", "Fixed daily pace")}
                </button>
              </div>
            ) : null}

            {/* Stepper: shown if cadenceType is pace */}
            {cadenceType === "pace" ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {unit === "verse"
                    ? tIntl("plans.custom.versesPerDay", {
                        count: paceAmount,
                        n: toLocaleNumeral(paceAmount, locale),
                      })
                    : paceAmount === 0.5
                      ? t("plans.custom.halfPagePerDay", "Half page/day")
                      : tIntl("plans.custom.pagesPerDay", {
                          count: paceAmount,
                          n: toLocaleNumeral(paceAmount, locale),
                        })}
                </span>
                <QuantityStepper
                  value={paceAmount}
                  onChange={setPaceAmount}
                  min={unit === "page" ? 0.5 : 1}
                  max={totalUnits}
                  step={1}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                {t("plans.custom.dailyHint", "The entire range repeats every day")}
              </p>
            )}

            {/* Repeating khatma toggle (when rangeMode is whole mushaf and cadence is pace) */}
            {rangeMode === "mushaf" && cadenceType === "pace" ? (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 mt-1 transition-colors">
                <input
                  type="checkbox"
                  id="repeat-khatma"
                  checked={repeat}
                  onChange={(e) => setRepeat(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary fq-focus-ring cursor-pointer"
                />
                <label htmlFor="repeat-khatma" className="flex flex-col gap-0.5 cursor-pointer flex-1">
                  <span className="text-xs font-bold text-foreground">
                    {t("plans.custom.repeatKhatma.title", "Repeat khatma automatically upon completion")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t(
                      "plans.custom.repeatKhatma.hint",
                      "Restarts automatically once the khatma is completed."
                    )}
                  </span>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Sub-form: Weekly Tab */}
        {cadenceTab === "weekly" ? (
          <div className="flex flex-col gap-3 pt-1">
            <span className="text-xs text-muted-foreground text-center">
              {t("plans.custom.weeklyHint", "Due on the same weekday every week")}
            </span>
            <div
              role="radiogroup"
              aria-label={t("plans.custom.weekdayLabel", "Due weekday")}
              className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border overflow-x-auto fq-scroll-nice"
            >
              {weekdayNames.map((dayName, i) => {
                const isSelected = weekday === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setWeekday(i)}
                    className={cn(
                      "flex-1 min-h-[44px] min-w-[40px] whitespace-nowrap px-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 fq-focus-ring flex items-center justify-center",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {dayName}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Sub-form: Deadline Tab */}
        {cadenceTab === "deadline" ? (
          <div className="flex flex-col gap-3.5 pt-1">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("plans.custom.targetDate", "Target date")}
                </label>
                {/* Preset chips */}
                <div className="flex items-center gap-1">
                  {[30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDeadlineEndDate(getDatePlusDays(days))}
                      className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      +{days}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="date"
                min={getTodayString()}
                value={deadlineEndDate}
                onChange={(e) => setDeadlineEndDate(e.target.value)}
                className="fq-focus-ring min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground"
              />
            </div>

            {/* Repetitions K Stepper: hidden for memorize */}
            {activity !== "memorize" ? (
              <div className="flex flex-col items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">
                  {t("plans.custom.repetitions", "Repetitions")}
                </span>
                <QuantityStepper
                  value={repetitions}
                  onChange={setRepetitions}
                  min={1}
                  step={1}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 5. Prominent Live Wird Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/10 p-4 transition-all duration-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mt-0.5">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {t("plans.custom.summaryBannerTitle", "Wird summary")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
              {summarySentence}
            </p>
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive text-center">{error}</p> : null}

      {/* 6. Submit CTA Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || isPending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform duration-150 min-h-[44px]"
      >
        {isEdit
          ? t("plans.custom.save", "Save changes")
          : t("plans.custom.submit", "Start wird")}
      </button>
    </div>
  );
};
