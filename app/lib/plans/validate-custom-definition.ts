/**
 * Validation and resolution for custom wird enrollment and editing (ADR 0067, #609).
 * Resolves high-level UI inputs (surah, juz, page, verse, weekly pace, deadline)
 * into canonical numeric CustomWirdDefinition and UserPlanParams.
 */

import {
  PLAN_ACTIVITIES,
  PLAN_DATE_RE,
  USER_PLAN_STATUSES,
  type CustomWirdCadence,
  type CustomWirdDefinition,
  type PlanActivity,
  type PlanUnit,
  type UserPlanParams,
  type UserPlanStatus,
} from "@/app/constants/plans";
import { getJuzPageRange, getSurahPageRange } from "@/app/lib/plans/resolve-units";
import { parseVerseOrdinal } from "@/app/lib/plans/verse-index";

export type CustomWirdRangeInput =
  | {
      mode: "surah";
      startSurah: number;
      endSurah?: number;
    }
  | {
      mode: "juz";
      startJuz: number;
      endJuz?: number;
    }
  | {
      mode: "page";
      startPage: number;
      endPage?: number;
    }
  | {
      mode: "verse";
      startVerse: number | string;
      endVerse?: number | string;
    };

export type CustomWirdCadenceInput =
  | {
      type: "pace";
      period?: "day" | "week";
      amount: number;
    }
  | {
      type: "deadline";
      endDate: string;
      repetitions?: number;
    }
  | {
      type: "weekly";
      weekday: number;
    };

export type CreateCustomPlanBody = {
  template_key: "custom";
  name: string;
  activity: PlanActivity;
  range: CustomWirdRangeInput;
  cadence: CustomWirdCadenceInput;
  start_date?: string;
};

export type PatchCustomPlanBody = {
  name?: string;
  cadence?: CustomWirdCadenceInput;
  range?: CustomWirdRangeInput;
  status?: UserPlanStatus;
};

export type ResolveCustomPlanEnrollmentResult =
  | {
      name: string;
      definition: CustomWirdDefinition;
      params: UserPlanParams;
      startDate: string;
    }
  | { error: string };

export type ResolveCustomPlanEditResult =
  | {
      name?: string;
      definition?: CustomWirdDefinition;
      params?: UserPlanParams;
      status?: UserPlanStatus;
    }
  | { error: string };

type ResolvedRange =
  | {
      unit: PlanUnit;
      rangeStart: number;
      rangeEnd: number;
    }
  | { error: string };

type ResolvedCadence =
  | {
      cadence: CustomWirdCadence;
      endDate?: string;
    }
  | { error: string };

const ALLOWED_KEYS_BY_MODE: Record<string, string[]> = {
  surah: ["mode", "startSurah", "endSurah"],
  juz: ["mode", "startJuz", "endJuz"],
  page: ["mode", "startPage", "endPage"],
  verse: ["mode", "startVerse", "endVerse"],
};

const ALLOWED_CADENCE_KEYS_BY_TYPE: Record<string, string[]> = {
  pace: ["type", "period", "amount"],
  deadline: ["type", "endDate", "repetitions"],
  weekly: ["type", "weekday"],
};

export const resolveCustomRange = async (
  rawRange: unknown
): Promise<ResolvedRange> => {
  if (!rawRange || typeof rawRange !== "object") {
    return { error: "Missing or invalid range" };
  }

  const range = rawRange as Record<string, unknown>;
  const mode = range.mode;
  if (typeof mode !== "string" || !ALLOWED_KEYS_BY_MODE[mode]) {
    return { error: "Invalid range mode" };
  }

  const allowedKeys = ALLOWED_KEYS_BY_MODE[mode];
  const keys = Object.keys(range);
  if (keys.some((k) => !allowedKeys.includes(k))) {
    return { error: "Cannot mix range modes" };
  }

  if (mode === "surah") {
    const startSurah = range.startSurah;
    if (typeof startSurah !== "number" || !Number.isInteger(startSurah) || startSurah < 1 || startSurah > 114) {
      return { error: "Invalid startSurah: must be 1..114" };
    }
    const endSurah = range.endSurah ?? startSurah;
    if (typeof endSurah !== "number" || !Number.isInteger(endSurah) || endSurah < 1 || endSurah > 114) {
      return { error: "Invalid endSurah: must be 1..114" };
    }
    if (startSurah > endSurah) {
      return { error: "Invalid surah range: startSurah must be <= endSurah" };
    }
    const pageRange = await getSurahPageRange(startSurah, endSurah);
    if (!pageRange) {
      return { error: "Unknown surah" };
    }
    const rangeStart = pageRange.startPage;
    const rangeEnd = pageRange.endPage;
    if (rangeStart < 1 || rangeEnd > 604 || rangeStart > rangeEnd) {
      return { error: "Resolved range is outside mushaf bounds" };
    }
    return {
      unit: "page",
      rangeStart,
      rangeEnd,
    };
  }

  if (mode === "juz") {
    const startJuz = range.startJuz;
    if (typeof startJuz !== "number" || !Number.isInteger(startJuz) || startJuz < 1 || startJuz > 30) {
      return { error: "Invalid startJuz: must be 1..30" };
    }
    const endJuz = range.endJuz ?? startJuz;
    if (typeof endJuz !== "number" || !Number.isInteger(endJuz) || endJuz < 1 || endJuz > 30) {
      return { error: "Invalid endJuz: must be 1..30" };
    }
    if (startJuz > endJuz) {
      return { error: "Invalid juz range: startJuz must be <= endJuz" };
    }
    const [startRange, endRange] = await Promise.all([
      getJuzPageRange(startJuz),
      getJuzPageRange(endJuz),
    ]);
    if (!startRange || !endRange) {
      return { error: "Unknown juz" };
    }
    const rangeStart = startRange.startPage;
    const rangeEnd = endRange.endPage;
    if (rangeStart < 1 || rangeEnd > 604 || rangeStart > rangeEnd) {
      return { error: "Resolved range is outside mushaf bounds" };
    }
    return {
      unit: "page",
      rangeStart,
      rangeEnd,
    };
  }

  if (mode === "page") {
    const startPage = range.startPage;
    if (typeof startPage !== "number" || !Number.isInteger(startPage) || startPage < 1 || startPage > 604) {
      return { error: "Invalid startPage: must be 1..604" };
    }
    const endPage = range.endPage ?? startPage;
    if (typeof endPage !== "number" || !Number.isInteger(endPage) || endPage < 1 || endPage > 604) {
      return { error: "Invalid endPage: must be 1..604" };
    }
    if (startPage > endPage) {
      return { error: "Invalid page range: startPage must be <= endPage" };
    }
    if (startPage < 1 || endPage > 604 || startPage > endPage) {
      return { error: "Resolved range is outside mushaf bounds" };
    }
    return {
      unit: "page",
      rangeStart: startPage,
      rangeEnd: endPage,
    };
  }

  if (mode === "verse") {
    const startVerse = range.startVerse;
    if (startVerse === undefined || startVerse === null) {
      return { error: "Missing startVerse" };
    }
    const startOrdinal = parseVerseOrdinal(startVerse);
    if (startOrdinal === null) {
      return { error: "Invalid verse range: use 1..6236 or 'surah:ayah'" };
    }
    const endVerse = range.endVerse ?? startVerse;
    const endOrdinal = parseVerseOrdinal(endVerse);
    if (endOrdinal === null) {
      return { error: "Invalid verse range: use 1..6236 or 'surah:ayah'" };
    }
    if (startOrdinal > endOrdinal) {
      return { error: "Invalid verse range: startVerse must be <= endVerse" };
    }
    return {
      unit: "verse",
      rangeStart: startOrdinal,
      rangeEnd: endOrdinal,
    };
  }

  return { error: "Invalid range mode" };
};

export const resolveCustomCadence = (
  rawCadence: unknown,
  unit: PlanUnit,
  activity: PlanActivity,
  startDate: string
): ResolvedCadence => {
  if (!rawCadence || typeof rawCadence !== "object") {
    return { error: "Missing or invalid cadence" };
  }

  const cadence = rawCadence as Record<string, unknown>;
  const type = cadence.type;

  if (typeof type !== "string" || !ALLOWED_CADENCE_KEYS_BY_TYPE[type]) {
    return { error: "Invalid cadence type" };
  }

  const allowedKeys = ALLOWED_CADENCE_KEYS_BY_TYPE[type];
  const keys = Object.keys(cadence);
  if (keys.some((k) => !allowedKeys.includes(k))) {
    return { error: "Unexpected field in cadence" };
  }

  if (type === "pace") {
    const period = cadence.period ?? "day";
    const amount = cadence.amount;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return { error: "Pace amount must be a positive number" };
    }

    if (period !== "day" && period !== "week") {
      return { error: "Invalid cadence period" };
    }

    if (period === "week") {
      if (unit === "verse") {
        return {
          error:
            "Weekly pace is not supported for verse-level wirds; specify verses per day or use a deadline.",
        };
      }
      // Confirmed decision #1: Weekly PAGE pace stays fractional (amount / 7).
      return {
        cadence: {
          type: "pace",
          unitsPerDay: amount / 7,
        },
      };
    }

    // Daily pace (period === "day")
    if (!Number.isInteger(amount) || amount < 1) {
      return { error: "Daily pace must be an integer" };
    }

    return {
      cadence: {
        type: "pace",
        unitsPerDay: amount,
      },
    };
  }

  if (type === "deadline") {
    const endDate = cadence.endDate;
    if (typeof endDate !== "string" || !PLAN_DATE_RE.test(endDate)) {
      return { error: "Invalid cadence.endDate" };
    }

    if (endDate < startDate) {
      return { error: "endDate must be on or after start date" };
    }

    const repetitions = cadence.repetitions ?? 1;
    if (
      typeof repetitions !== "number" ||
      !Number.isInteger(repetitions) ||
      repetitions < 1 ||
      repetitions > 100
    ) {
      return { error: "cadence.repetitions must be between 1 and 100" };
    }

    // C2 contract #3: reject repetitions > 1 when activity === "memorize"
    if (activity === "memorize" && repetitions > 1) {
      return { error: "Memorize plans do not support multiple repetitions" };
    }

    return {
      cadence: {
        type: "deadline",
        endDate,
        ...(repetitions > 1 ? { repetitions } : {}),
      },
      endDate,
    };
  }

  if (type === "weekly") {
    const weekday = cadence.weekday;
    if (
      typeof weekday !== "number" ||
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6
    ) {
      return { error: "cadence.weekday must be an integer 0..6" };
    }
    return {
      cadence: {
        type: "weekly",
        weekday,
      },
    };
  }

  return { error: "Invalid cadence type" };
};

export const resolveCustomPlanEnrollment = async (
  body: unknown
): Promise<ResolveCustomPlanEnrollmentResult> => {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  if (b.template_key !== "custom") {
    return { error: "Invalid template_key" };
  }

  if (typeof b.name !== "string") {
    return { error: "name must be between 1 and 100 characters" };
  }
  const name = b.name.trim();
  if (name.length < 1 || name.length > 100) {
    return { error: "name must be between 1 and 100 characters" };
  }

  const activity = b.activity as PlanActivity;
  if (!PLAN_ACTIVITIES.includes(activity)) {
    return { error: "Invalid activity" };
  }

  if (b.start_date !== undefined) {
    if (typeof b.start_date !== "string" || !PLAN_DATE_RE.test(b.start_date)) {
      return { error: "Invalid start_date" };
    }
  }
  const startDate =
    typeof b.start_date === "string" && PLAN_DATE_RE.test(b.start_date)
      ? b.start_date
      : new Date().toISOString().slice(0, 10);

  const rangeResult = await resolveCustomRange(b.range);
  if ("error" in rangeResult) {
    return { error: rangeResult.error };
  }

  const cadenceResult = resolveCustomCadence(
    b.cadence,
    rangeResult.unit,
    activity,
    startDate
  );
  if ("error" in cadenceResult) {
    return { error: cadenceResult.error };
  }

  const definition: CustomWirdDefinition = {
    activity,
    unit: rangeResult.unit,
    rangeStart: rangeResult.rangeStart,
    rangeEnd: rangeResult.rangeEnd,
    cadence: cadenceResult.cadence,
  };

  const params: UserPlanParams = {
    trackUnits: { custom: rangeResult.unit },
    ...(cadenceResult.endDate ? { endDate: cadenceResult.endDate } : {}),
  };

  return {
    name,
    definition,
    params,
    startDate,
  };
};

export const resolveCustomPlanEdit = async (
  body: unknown,
  existingPlan: {
    name?: string | null;
    template_key: string;
    definition?: unknown;
    params?: unknown;
    start_date?: Date;
  },
  progressCount: number
): Promise<ResolveCustomPlanEditResult> => {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  if (existingPlan.template_key !== "custom") {
    return { error: "Plan is not a custom wird" };
  }

  const b = body as Record<string, unknown>;

  let updatedStatus: UserPlanStatus | undefined = undefined;
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !USER_PLAN_STATUSES.includes(b.status as UserPlanStatus)) {
      return { error: "Invalid status" };
    }
    updatedStatus = b.status as UserPlanStatus;
  }

  let updatedName: string | undefined = undefined;
  if (b.name !== undefined) {
    if (typeof b.name !== "string") {
      return { error: "name must be between 1 and 100 characters" };
    }
    const trimmed = b.name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      return { error: "name must be between 1 and 100 characters" };
    }
    updatedName = trimmed;
  }

  if (b.activity !== undefined) {
    return { error: "activity cannot change after enrollment" };
  }

  const hasDefinitionEdit = b.range !== undefined || b.cadence !== undefined;

  if (!hasDefinitionEdit) {
    return {
      ...(updatedName !== undefined ? { name: updatedName } : {}),
      ...(updatedStatus !== undefined ? { status: updatedStatus } : {}),
    };
  }

  const currentDef = existingPlan.definition as CustomWirdDefinition | null;
  if (
    !currentDef ||
    typeof currentDef !== "object" ||
    !currentDef.activity ||
    !currentDef.unit ||
    typeof currentDef.rangeStart !== "number" ||
    typeof currentDef.rangeEnd !== "number" ||
    !currentDef.cadence
  ) {
    return { error: "Corrupted custom plan definition" };
  }

  let updatedRangeStart = currentDef.rangeStart;
  let updatedRangeEnd = currentDef.rangeEnd;
  if (b.range !== undefined) {
    // Range editable only while 0 progress has been logged
    if (progressCount > 0) {
      return {
        error:
          "Cannot change target range after progress has been logged; create a new custom wird instead.",
      };
    }
    const rangeResult = await resolveCustomRange(b.range);
    if ("error" in rangeResult) {
      return { error: rangeResult.error };
    }
    // ADR 0038: unit cannot change
    if (rangeResult.unit !== currentDef.unit) {
      return { error: "Track unit cannot change after enrollment" };
    }
    updatedRangeStart = rangeResult.rangeStart;
    updatedRangeEnd = rangeResult.rangeEnd;
  }

  let updatedCadence = currentDef.cadence;

  if (b.cadence !== undefined) {
    const startDateStr = existingPlan.start_date
      ? existingPlan.start_date.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const cadenceResult = resolveCustomCadence(
      b.cadence,
      currentDef.unit,
      currentDef.activity,
      startDateStr
    );
    if ("error" in cadenceResult) {
      return { error: cadenceResult.error };
    }
    updatedCadence = cadenceResult.cadence;
  }

  const nextDefinition: CustomWirdDefinition = {
    activity: currentDef.activity,
    unit: currentDef.unit,
    rangeStart: updatedRangeStart,
    rangeEnd: updatedRangeEnd,
    cadence: updatedCadence,
  };

  const existingParams = (existingPlan.params as UserPlanParams | null) ?? {};
  const nextParams: UserPlanParams = {
    ...existingParams,
    trackUnits: { custom: nextDefinition.unit },
  };

  if (nextDefinition.cadence.type === "deadline") {
    nextParams.endDate = nextDefinition.cadence.endDate;
  } else {
    delete nextParams.endDate;
  }

  return {
    ...(updatedName !== undefined ? { name: updatedName } : {}),
    ...(updatedStatus !== undefined ? { status: updatedStatus } : {}),
    definition: nextDefinition,
    params: nextParams,
  };
};
