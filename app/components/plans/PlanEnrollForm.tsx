"use client";

import { useState } from "react";
import useTranslations from "@hooks/use-translations";
import { PLAN_TEMPLATES, type UserPlanParams } from "@constants/plans";
import { PLAN_TRACK_UI } from "@constants/plan-ui";
import { usePlans } from "@hooks/use-plans";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import { JuzRangeSlider } from "./JuzRangeSlider";
import { QuantityStepper } from "./QuantityStepper";

// Which of a template's tracks expose an editable pages/day field at
// enroll/edit time. tahdeer's repetitions and qareeb's windowSize stay fixed —
// only the self-advancing/quantity-bearing tracks are user-editable.
const EDITABLE_QUANTITY_TRACKS: Record<string, string[]> = {
  "daily-wird": ["reading"],
  "listening-wird": ["listening"],
  husun: ["hifz", "tilawa", "baeed"],
};

type Props = {
  templateKey: string;
  /** Present => edit an existing active enrollment instead of creating one. */
  existingPlan?: UserPlanListItem;
  onDone: () => void;
};

export const PlanEnrollForm = ({ templateKey, existingPlan, onDone }: Props) => {
  const t = useTranslations();
  const { enroll, updateParams } = usePlans();

  const template = PLAN_TEMPLATES[templateKey];
  const trackKeys = EDITABLE_QUANTITY_TRACKS[templateKey] ?? [];
  const needsTargetRange = template.tracks.some((tr) => tr.rule.kind === "cursor_advance");
  const isEdit = existingPlan !== undefined;

  const defaultFor = (trackKey: string) => {
    const existing = existingPlan?.params.quantities?.[trackKey];
    if (existing !== undefined) return existing;
    const rule = template.tracks.find((tr) => tr.key === trackKey)?.rule;
    return rule && "defaultUnitsPerDay" in rule ? rule.defaultUnitsPerDay : 1;
  };

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(trackKeys.map((k) => [k, defaultFor(k)]))
  );
  // Whole mushaf by default — narrower targets (e.g. Juz Amma) are the
  // user's choice, not the default.
  const [juzFrom, setJuzFrom] = useState(existingPlan?.target_juz_start ?? 1);
  const [juzTo, setJuzTo] = useState(existingPlan?.target_juz_end ?? 30);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    trackKeys.every((k) => Number.isInteger(quantities[k]) && quantities[k] >= 1) &&
    (!needsTargetRange || juzFrom <= juzTo);

  const isPending = isEdit ? updateParams.isPending : enroll.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!isValid) return;

    const params: UserPlanParams = { quantities };
    const success = isEdit
      ? await updateParams.mutateAsync({
          planId: existingPlan.id,
          params,
          ...(needsTargetRange ? { targetJuzStart: juzFrom, targetJuzEnd: juzTo } : {}),
        })
      : await enroll.mutateAsync({
          templateKey,
          params,
          ...(needsTargetRange ? { targetJuzStart: juzFrom, targetJuzEnd: juzTo } : {}),
        });

    if (success) onDone();
    else setError(t("plans.enrollError", "Something went wrong. Try again."));
  };

  return (
    <div className="flex flex-col gap-6">
      {trackKeys.map((trackKey) => {
        const ui = PLAN_TRACK_UI[trackKey];
        return (
          <div key={trackKey} className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {ui ? t(ui.labelKey, ui.defaultLabel) : trackKey}
              {" — "}
              {t("plans.pagesPerDay", "pages/day")}
            </span>
            <QuantityStepper
              value={quantities[trackKey]}
              onChange={(v) => setQuantities((prev) => ({ ...prev, [trackKey]: v }))}
            />
          </div>
        );
      })}

      {needsTargetRange ? (
        <JuzRangeSlider from={juzFrom} to={juzTo} onChange={(f, tt) => { setJuzFrom(f); setJuzTo(tt); }} />
      ) : null}

      {error ? <p className="text-xs text-destructive text-center">{error}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || isPending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform duration-150"
      >
        {isEdit ? t("plans.saveChanges", "Save changes") : t("plans.enroll", "Start plan")}
      </button>
    </div>
  );
};
