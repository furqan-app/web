"use client";

import { useLocale } from "next-intl";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@utils/i18n";
import { Slider } from "@/components/ui/slider";

type Props = {
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
};

const MIN_JUZ = 1;
const MAX_JUZ = 30;

// Dual-handle juz-range picker (husun's target-memorization range). Radix's
// own `dir` prop flips the track orientation for RTL — no hand-rolled
// pointer/clientX math needed (unlike the design prototype this replaces).
export const JuzRangeSlider = ({ from, to, onChange }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">
          {t("plans.targetRange", "Target range (juz)")}
        </span>
        <span className="text-xs font-semibold text-primary">
          {toLocaleNumeral(from, locale)} – {toLocaleNumeral(to, locale)}
        </span>
      </div>
      <Slider
        dir={dir}
        min={MIN_JUZ}
        max={MAX_JUZ}
        step={1}
        value={[from, to]}
        onValueChange={([nextFrom, nextTo]) => onChange(nextFrom, nextTo)}
        minStepsBetweenThumbs={0}
        className="my-1"
      />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{toLocaleNumeral(MIN_JUZ, locale)}</span>
        <span>{toLocaleNumeral(MAX_JUZ, locale)}</span>
      </div>
    </div>
  );
};
