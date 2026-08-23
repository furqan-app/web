"use client";

import { useState } from "react";
import useTranslations from "@hooks/use-translations";
import {
  PLAN_TEMPLATES,
  toVerseEquivalent,
  type PlanQuantity,
  type PlanUnit,
  type UserPlanParams,
} from "@constants/plans";
import { PLAN_TRACK_UI } from "@constants/plan-ui";
import { usePlans } from "@hooks/use-plans";
import type { UserPlanListItem } from "@/app/server/actions/plans";
import { JuzRangeSlider } from "./JuzRangeSlider";
import { QuantityStepper } from "./QuantityStepper";

/**
 * A group of quantity fields that share one unit choice (ADR 0038, widened):
 * `independentTrackKey` is the fixed_cycle/cursor_advance track the user
 * actually picks a unit for; `dependentTrackKeys` are tracks whose own range
 * math inherits that track's unit (trailing_window/completed_cycle/
 * lookahead sourced from it) — their quantity fields render in the same
 * group, sharing its unit label, but never get their own unit toggle.
 */
type UnitGroup = { independentTrackKey: string; dependentTrackKeys: string[] };

const UNIT_GROUPS: Record<string, UnitGroup[]> = {
  "daily-wird": [{ independentTrackKey: "reading", dependentTrackKeys: [] }],
  "listening-wird": [{ independentTrackKey: "listening", dependentTrackKeys: [] }],
  husun: [
    { independentTrackKey: "tilawa", dependentTrackKeys: [] },
    { independentTrackKey: "hifz", dependentTrackKeys: ["baeed", "tahdeer", "qareeb"] },
  ],
};

// tahdeer's repetitions is a plain count (never a page/verse pace) — its
// stepper never takes the fraction step even when its group's mode does.
const isRepetitionsField = (trackKey: string) => trackKey === "tahdeer";

// Only the daily-pace fields ever take the {unit:"pages"} fractional form —
// mirrors validate-params.ts's FRACTIONAL_QUANTITY_TRACKS. qareeb's
// windowSize stays a plain integer (in the group's page-or-verse unit) even
// when the group's mode is "fraction", since a review-window size isn't a
// live-recomputed daily pace.
const FRACTION_ELIGIBLE_TRACKS = new Set(["reading", "listening", "tilawa", "hifz", "baeed"]);

/**
 * How one unit-group's quantities are expressed (ADR 0038, widened): "pages"
 * = page-unit, whole pages/day (pre-widening behavior, unchanged); "verses"
 * = verse-unit, whole verses/day; "fraction" = verse-unit, a fractional
 * pages/day pace resolved live each day from the actual current page
 * (params.quantities as {unit:"pages"}) — only for the group's pace field(s)
 * (reading/listening/tilawa/hifz/baeed); a repetitions or windowSize field in
 * the same group is always a plain integer in the group's page-or-verse
 * unit, never fractional. Fixed for the life of an enrollment — the edit
 * form always resends it.
 */
type QuantityMode = "pages" | "verses" | "fraction";

const modeForGroup = (existingPlan: UserPlanListItem | undefined, group: UnitGroup): QuantityMode => {
  if (!existingPlan) return "pages";
  const unit = existingPlan.params.trackUnits?.[group.independentTrackKey] ?? "page";
  if (unit !== "verse") return "pages";
  const paceKey = group.independentTrackKey;
  const anyFraction = typeof existingPlan.params.quantities?.[paceKey] === "object";
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
  const groups = UNIT_GROUPS[templateKey] ?? [];
  const needsTargetRange = template.tracks.some((tr) => tr.rule.kind === "cursor_advance");
  const isEdit = existingPlan !== undefined;

  const defaultPagesFor = (trackKey: string) => {
    const rule = template.tracks.find((tr) => tr.key === trackKey)?.rule;
    if (!rule) return 1;
    if ("defaultUnitsPerDay" in rule) return rule.defaultUnitsPerDay;
    if (rule.kind === "trailing_window") return rule.windowSize;
    if (rule.kind === "lookahead") return rule.repetitions;
    return 1;
  };

  // Raw numeric value shown in one field's stepper — semantics depend on the
  // owning group's mode (pages/day, verses/day, or a fractional pages/day
  // amount), except repetitions fields, which are always a plain count.
  const valueFor = (trackKey: string, mode: QuantityMode): number => {
    const existing = existingPlan?.params.quantities?.[trackKey];
    if (isRepetitionsField(trackKey)) {
      return typeof existing === "number" ? existing : defaultPagesFor(trackKey);
    }
    // A non-fraction-eligible field (qareeb) in a "fraction" group still
    // shows a plain verse-scale value — fraction mode only ever applies to
    // the group's own pace field.
    const effectiveMode: QuantityMode =
      mode === "fraction" && !FRACTION_ELIGIBLE_TRACKS.has(trackKey) ? "verses" : mode;
    if (effectiveMode === "fraction") {
      return existing && typeof existing === "object" ? existing.amount : 0.5;
    }
    if (typeof existing === "number") return existing;
    const pagesDefault = defaultPagesFor(trackKey);
    return effectiveMode === "verses" ? toVerseEquivalent(pagesDefault) : pagesDefault;
  };

  const fieldKeysOf = (group: UnitGroup) => [group.independentTrackKey, ...group.dependentTrackKeys];

  const [modes, setModes] = useState<Record<string, QuantityMode>>(() =>
    Object.fromEntries(groups.map((g) => [g.independentTrackKey, modeForGroup(existingPlan, g)]))
  );
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      groups.flatMap((g) =>
        fieldKeysOf(g).map((k) => [k, valueFor(k, modeForGroup(existingPlan, g))])
      )
    )
  );
  // Whole mushaf by default — narrower targets (e.g. Juz Amma) are the
  // user's choice, not the default.
  const [juzFrom, setJuzFrom] = useState(existingPlan?.target_juz_start ?? 1);
  const [juzTo, setJuzTo] = useState(existingPlan?.target_juz_end ?? 30);
  const [error, setError] = useState<string | null>(null);

  const changeGroupMode = (group: UnitGroup, next: QuantityMode) => {
    setModes((prev) => ({ ...prev, [group.independentTrackKey]: next }));
    // Toggling resets every field in the group to that mode's own sensible
    // default, rather than reinterpreting the same raw number under a new
    // unit — repetitions fields are untouched (unit-agnostic).
    setValues((prev) => ({
      ...prev,
      ...Object.fromEntries(
        fieldKeysOf(group).map((k) => [
          k,
          isRepetitionsField(k) ? prev[k] : valueFor(k, next),
        ])
      ),
    }));
  };

  const allFieldKeys = groups.flatMap(fieldKeysOf);
  const isValid =
    allFieldKeys.every((k) => {
      const mode = modes[groups.find((g) => fieldKeysOf(g).includes(k))!.independentTrackKey];
      return !FRACTION_ELIGIBLE_TRACKS.has(k) || mode !== "fraction"
        ? Number.isInteger(values[k]) && values[k] >= 1
        : Number.isFinite(values[k]) && values[k] > 0;
    }) && (!needsTargetRange || juzFrom <= juzTo);

  const isPending = isEdit ? updateParams.isPending : enroll.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!isValid) return;

    const quantities: Record<string, PlanQuantity> = {};
    const trackUnits: Record<string, PlanUnit> = {};
    for (const group of groups) {
      const mode = modes[group.independentTrackKey];
      trackUnits[group.independentTrackKey] = mode === "pages" ? "page" : "verse";
      for (const key of fieldKeysOf(group)) {
        quantities[key] =
          mode === "fraction" && FRACTION_ELIGIBLE_TRACKS.has(key)
            ? { unit: "pages" as const, amount: values[key] }
            : values[key];
      }
    }
    const params: UserPlanParams = { quantities, trackUnits };
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
  const modeOptionsFor = (group: UnitGroup) =>
    isEdit
      ? MODE_OPTIONS_ALL.filter(
          (o) => (o.key === "pages") === ((existingPlan!.params.trackUnits?.[group.independentTrackKey] ?? "page") !== "verse")
        )
      : MODE_OPTIONS_ALL;

  const unitSuffixFor = (mode: QuantityMode) =>
    mode === "pages"
      ? t("plans.pagesPerDay", "pages/day")
      : mode === "verses"
        ? t("plans.versesPerDay", "verses/day")
        : t("plans.pagesPerDay", "pages/day");

  const windowUnitSuffixFor = (mode: QuantityMode) =>
    mode === "pages" ? t("plans.pages", "pages") : t("plans.verses", "verses");

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const mode = modes[group.independentTrackKey];
        const modeOptions = modeOptionsFor(group);
        const fieldKeys = fieldKeysOf(group);

        return (
          <div key={group.independentTrackKey} className="flex flex-col gap-4">
            {modeOptions.length > 1 ? (
              <div className="flex justify-center gap-1 rounded-full bg-muted p-1">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => changeGroupMode(group, opt.key)}
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

            {fieldKeys.map((trackKey) => {
              const ui = PLAN_TRACK_UI[trackKey];
              const isRepetitions = isRepetitionsField(trackKey);
              const isWindow = trackKey === "qareeb";
              const unitSuffix = isRepetitions
                ? t("plans.repetitions", "repetitions")
                : isWindow
                  ? windowUnitSuffixFor(mode)
                  : unitSuffixFor(mode);
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
                    min={FRACTION_ELIGIBLE_TRACKS.has(trackKey) && mode === "fraction" ? 0.5 : 1}
                    step={FRACTION_ELIGIBLE_TRACKS.has(trackKey) && mode === "fraction" ? 0.5 : 1}
                  />
                </div>
              );
            })}
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
