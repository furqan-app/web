"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { PLAN_TEMPLATES, type UserPlanParams } from "@constants/plans";
import { PLAN_TRACK_UI } from "@constants/plan-ui";
import { usePlans } from "@hooks/use-plans";

// Which of a template's tracks expose an editable pages/day field at
// enroll time. tahdeer's repetitions and qareeb's windowSize stay fixed —
// only the self-advancing/quantity-bearing tracks are user-editable.
const EDITABLE_QUANTITY_TRACKS: Record<string, string[]> = {
  "daily-wird": ["reading"],
  "listening-wird": ["listening"],
  husun: ["hifz", "tilawa", "baeed"],
};

const JUZ_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

type Props = {
  templateKey: string;
  onEnrolled: () => void;
};

export const PlanEnrollForm = ({ templateKey, onEnrolled }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const { enroll } = usePlans();

  const template = PLAN_TEMPLATES[templateKey];
  const trackKeys = EDITABLE_QUANTITY_TRACKS[templateKey] ?? [];
  const needsTargetRange = template.tracks.some((tr) => tr.rule.kind === "cursor_advance");

  const defaultFor = (trackKey: string) => {
    const rule = template.tracks.find((tr) => tr.key === trackKey)?.rule;
    return rule && "defaultUnitsPerDay" in rule ? rule.defaultUnitsPerDay : 1;
  };

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(trackKeys.map((k) => [k, defaultFor(k)]))
  );
  // Whole mushaf by default — narrower targets (e.g. Juz Amma) are the
  // user's choice, not the default.
  const [juzFrom, setJuzFrom] = useState(1);
  const [juzTo, setJuzTo] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    trackKeys.every((k) => Number.isInteger(quantities[k]) && quantities[k] >= 1) &&
    (!needsTargetRange || juzFrom <= juzTo);

  const handleSubmit = async () => {
    setError(null);
    if (!isValid) return;

    const params: UserPlanParams = { quantities };
    const result = await enroll.mutateAsync({
      templateKey,
      params,
      ...(needsTargetRange ? { targetJuzStart: juzFrom, targetJuzEnd: juzTo } : {}),
    });

    if (result) onEnrolled();
    else setError(t("plans.enrollError", "Something went wrong. Try again."));
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
      {trackKeys.map((trackKey) => {
        const ui = PLAN_TRACK_UI[trackKey];
        return (
          <label key={trackKey} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">
              {ui ? t(ui.labelKey, ui.defaultLabel) : trackKey}
              {" — "}
              {t("plans.pagesPerDay", "pages/day")}
            </span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={quantities[trackKey]}
              onChange={(e) =>
                setQuantities((prev) => ({ ...prev, [trackKey]: Number(e.target.value) }))
              }
              className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-end text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        );
      })}

      {needsTargetRange ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">{t("plans.targetRange", "Target range (juz)")}</span>
          <div className="flex items-center gap-2">
            <select
              value={juzFrom}
              onChange={(e) => setJuzFrom(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {JUZ_NUMBERS.map((n) => (
                <option key={n} value={n}>
                  {toLocaleNumeral(n, locale)}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">{t("plans.to", "to")}</span>
            <select
              value={juzTo}
              onChange={(e) => setJuzTo(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {JUZ_NUMBERS.map((n) => (
                <option key={n} value={n}>
                  {toLocaleNumeral(n, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || enroll.isPending}
        className="self-end rounded-xl px-4 py-2 text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform duration-150"
      >
        {t("plans.enroll", "Start plan")}
      </button>
    </div>
  );
};
