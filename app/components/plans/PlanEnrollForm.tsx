"use client";

import { useState } from "react";
import useTranslations from "@hooks/use-translations";
import {
  PLAN_TEMPLATES,
  toVerseEquivalent,
  type PlanQuantity,
  type UserPlanParams,
} from "@constants/plans";
import { PLAN_TRACK_UI } from "@constants/plan-ui";
import { usePlans } from "@hooks/use-plans";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import { JuzRangeSlider } from "./JuzRangeSlider";
import { QuantityStepper } from "./QuantityStepper";

// Which of a template's tracks expose an editable quantity field at
// enroll/edit time. tahdeer's repetitions and qareeb's windowSize stay fixed —
// only the self-advancing/quantity-bearing tracks are user-editable.
const EDITABLE_QUANTITY_TRACKS: Record<string, string[]> = {
  "daily-wird": ["reading"],
  "listening-wird": ["listening"],
  husun: ["hifz", "tilawa", "baeed"],
};

/**
 * How quantities are expressed for this enrollment (ADR 0038) — a single
 * enrollment-wide choice, applied to every quantity field in the form:
 * "pages" = page-unit enrollment, whole pages/day (pre-widening behavior,
 * unchanged); "verses" = verse-unit enrollment, whole verses/day; "fraction"
 * = verse-unit enrollment, a fractional pages/day pace resolved live each
 * day from the actual current page (params.quantities as {unit:"pages"}).
 * Fixed for the life of an enrollment — the edit form always resends it.
 */
type QuantityMode = "pages" | "verses" | "fraction";

const modeFor = (existingPlan?: UserPlanListItem, trackKeys: string[] = []): QuantityMode => {
  if (!existingPlan || existingPlan.params.unit !== "verse") return "pages";
  const anyFraction = trackKeys.some(
    (k) => typeof existingPlan.params.quantities?.[k] === "object"
  );
  return anyFraction ? "fraction" : "verses";
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

  const defaultPagesFor = (trackKey: string) => {
    const rule = template.tracks.find((tr) => tr.key === trackKey)?.rule;
    return rule && "defaultUnitsPerDay" in rule ? rule.defaultUnitsPerDay : 1;
  };

  // Raw numeric value shown in each field's stepper — semantics depend on
  // `mode` (pages/day, verses/day, or a fractional pages/day amount).
  const valueFor = (trackKey: string, mode: QuantityMode): number => {
    const existing = existingPlan?.params.quantities?.[trackKey];
    if (mode === "fraction") {
      return existing && typeof existing === "object" ? existing.amount : 0.5;
    }
    if (typeof existing === "number") return existing;
    const pagesDefault = defaultPagesFor(trackKey);
    return mode === "verses" ? toVerseEquivalent(pagesDefault) : pagesDefault;
  };

  const [mode, setMode] = useState<QuantityMode>(() => modeFor(existingPlan, trackKeys));
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(trackKeys.map((k) => [k, valueFor(k, modeFor(existingPlan, trackKeys))]))
  );
  // Whole mushaf by default — narrower targets (e.g. Juz Amma) are the
  // user's choice, not the default.
  const [juzFrom, setJuzFrom] = useState(existingPlan?.target_juz_start ?? 1);
  const [juzTo, setJuzTo] = useState(existingPlan?.target_juz_end ?? 30);
  const [error, setError] = useState<string | null>(null);

  const changeMode = (next: QuantityMode) => {
    setMode(next);
    // Toggling resets every field to that mode's own sensible default,
    // rather than reinterpreting the same raw number under a new unit.
    setValues(Object.fromEntries(trackKeys.map((k) => [k, valueFor(k, next)])));
  };

  const isValid =
    trackKeys.every((k) =>
      mode === "fraction" ? Number.isFinite(values[k]) && values[k] > 0 : Number.isInteger(values[k]) && values[k] >= 1
    ) && (!needsTargetRange || juzFrom <= juzTo);

  const isPending = isEdit ? updateParams.isPending : enroll.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!isValid) return;

    const quantities: Record<string, PlanQuantity> = Object.fromEntries(
      trackKeys.map((k) => [k, mode === "fraction" ? { unit: "pages" as const, amount: values[k] } : values[k]])
    );
    const params: UserPlanParams = {
      quantities,
      ...(mode === "pages" ? {} : { unit: "verse" as const }),
    };
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

  const MODE_OPTIONS_ALL: { key: QuantityMode; labelKey: string; defaultLabel: string }[] = [
    { key: "pages", labelKey: "plans.quantityMode.pages", defaultLabel: "Pages" },
    { key: "verses", labelKey: "plans.quantityMode.verses", defaultLabel: "Verses" },
    { key: "fraction", labelKey: "plans.quantityMode.fraction", defaultLabel: "Fraction of a page" },
  ];
  // A track's unit is fixed for its enrollment's lifetime (ADR 0038) — an
  // edit can switch between "verses" and "fraction" (both verse-unit), but
  // never cross into/out of "pages" (page-unit), since the server rejects a
  // unit change on PATCH.
  const MODE_OPTIONS = isEdit
    ? MODE_OPTIONS_ALL.filter((o) => (o.key === "pages") === (existingPlan.params.unit !== "verse"))
    : MODE_OPTIONS_ALL;

  return (
    <div className="flex flex-col gap-6">
      {trackKeys.length > 0 && MODE_OPTIONS.length > 1 ? (
        <div className="flex justify-center gap-1 rounded-full bg-muted p-1">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => changeMode(opt.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(opt.labelKey, opt.defaultLabel)}
            </button>
          ))}
        </div>
      ) : null}

      {trackKeys.map((trackKey) => {
        const ui = PLAN_TRACK_UI[trackKey];
        const unitSuffix =
          mode === "pages"
            ? t("plans.pagesPerDay", "pages/day")
            : mode === "verses"
              ? t("plans.versesPerDay", "verses/day")
              : t("plans.pagesPerDay", "pages/day");
        return (
          <div key={trackKey} className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {ui ? t(ui.labelKey, ui.defaultLabel) : trackKey}
              {" — "}
              {unitSuffix}
            </span>
            <QuantityStepper
              value={values[trackKey]}
              onChange={(v) => setValues((prev) => ({ ...prev, [trackKey]: v }))}
              min={mode === "fraction" ? 0.5 : 1}
              step={mode === "fraction" ? 0.5 : 1}
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
