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
};

export const buildRangeInput = (
  state: CustomWirdFormState
): CustomWirdRangeInput => {
  switch (state.rangeMode) {
    case "mushaf":
      return { mode: "page", startPage: 1, endPage: 604 };
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
  if (state.cadenceType === "pace") {
    cadence = {
      type: "pace",
      period: state.pacePeriod,
      amount: state.paceAmount,
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

  if (state.cadenceType === "pace") {
    body.cadence = {
      type: "pace",
      period: state.pacePeriod,
      amount: state.paceAmount,
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
