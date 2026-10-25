import type { PlanActivity } from "@/app/constants/plans";
import type {
  CreateCustomPlanBody,
  CustomWirdCadenceInput,
  CustomWirdRangeInput,
  PatchCustomPlanBody,
} from "@/app/lib/plans/validate-custom-definition";
import type {
  CustomCadenceType,
  CustomWirdFormMode,
} from "@/app/lib/plans/custom-wird-estimate";

export type CustomWirdFormState = {
  name: string;
  activity: PlanActivity;
  rangeMode: CustomWirdFormMode;
  startSurah: number;
  endSurah: number;
  startJuz: number;
  endJuz: number;
  startPage: number;
  endPage: number;
  startVerse: { surah: number; ayah: number };
  endVerse: { surah: number; ayah: number };
  cadenceType: CustomCadenceType;
  pacePeriod: "day" | "week";
  paceAmount: number;
  deadlineEndDate: string;
  repetitions: number;
  /** Due weekday (0–6) — only read when cadenceType === "weekly". */
  weekday: number;
  /** Whether to repeat the khatma upon completion when range is whole mushaf. */
  repeat?: boolean;
};

export const buildRangeInput = (
  state: CustomWirdFormState
): CustomWirdRangeInput => {
  switch (state.rangeMode) {
    case "mushaf":
      return { mode: "page", startPage: state.startPage, endPage: 604 };
    case "surah":
      return { mode: "surah", startSurah: state.startSurah, endSurah: state.endSurah };
    case "juz":
      return { mode: "juz", startJuz: state.startJuz, endJuz: state.endJuz };
    case "page":
      return { mode: "page", startPage: state.startPage, endPage: state.endPage };
    case "verse":
      return {
        mode: "verse",
        startVerse: `${state.startVerse.surah}:${state.startVerse.ayah}`,
        endVerse: `${state.endVerse.surah}:${state.endVerse.ayah}`,
      };
  }
};

export const buildCustomCreateBody = (
  state: CustomWirdFormState
): CreateCustomPlanBody => {
  const range = buildRangeInput(state);

  let cadence: CustomWirdCadenceInput;
  if (state.cadenceType === "daily") {
    cadence = {
      type: "daily",
    };
  } else if (state.cadenceType === "weekly") {
    cadence = {
      type: "weekly",
      weekday: state.weekday,
    };
  } else if (state.cadenceType === "pace") {
    cadence = {
      type: "pace",
      period: state.pacePeriod,
      amount: state.paceAmount,
      ...(state.rangeMode === "mushaf" && state.repeat !== undefined ? { repeat: state.repeat } : {}),
    };
  } else {
    cadence = {
      type: "deadline",
      endDate: state.deadlineEndDate,
      ...(state.repetitions > 1 && state.activity !== "memorize"
        ? { repetitions: state.repetitions }
        : {}),
    };
  }

  return {
    template_key: "custom",
    name: state.name.trim(),
    activity: state.activity,
    range,
    cadence,
  };
};

export const buildCustomPatchBody = (
  state: CustomWirdFormState,
  hasProgress: boolean
): PatchCustomPlanBody => {
  const body: PatchCustomPlanBody = {
    name: state.name.trim(),
  };

  if (!hasProgress) {
    body.range = buildRangeInput(state);
  }

  if (state.cadenceType === "daily") {
    body.cadence = {
      type: "daily",
    };
  } else if (state.cadenceType === "weekly") {
    body.cadence = {
      type: "weekly",
      weekday: state.weekday,
    };
  } else if (state.cadenceType === "pace") {
    body.cadence = {
      type: "pace",
      period: state.pacePeriod,
      amount: state.paceAmount,
      ...(state.rangeMode === "mushaf" && state.repeat !== undefined ? { repeat: state.repeat } : {}),
    };
  } else {
    body.cadence = {
      type: "deadline",
      endDate: state.deadlineEndDate,
      ...(state.repetitions > 1 && state.activity !== "memorize"
        ? { repetitions: state.repetitions }
        : {}),
    };
  }

  return body;
};

export const bindDedicatedReminderSafe = async ({
  planId,
  time,
  locale,
  fetchFn = fetch,
}: {
  planId: number;
  time: string;
  locale: string;
  fetchFn?: typeof fetch;
}): Promise<boolean> => {
  try {
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : "UTC";
    const res = await fetchFn("/api/notifications/daily-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "dedicated",
        planId,
        time,
        enabled: true,
        timezone,
        locale,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to auto-bind dedicated reminder for preset plan:", err);
    return false;
  }
};
