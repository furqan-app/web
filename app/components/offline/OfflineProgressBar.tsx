"use client";

import { useLocale, useTranslations as useIntlTranslations } from "next-intl";
import { toLocaleNumeral } from "@/app/utils/i18n";

type Props = {
  cached: number;
  total: number;
  /** Settings renders a tighter label than the gate/prompt. */
  size?: "sm" | "md";
};

/**
 * The determinate download bar plus its "{cached} of {total} pages" label.
 *
 * Shared by every surface so the accessibility attributes exist in one place —
 * the Settings copy of this markup previously had no `role="progressbar"`, making
 * the bar invisible to assistive tech on one surface but not the other.
 */
export const OfflineProgressBar = ({ cached, total, size = "md" }: Props) => {
  const locale = useLocale();
  // Parameterized key — next-intl directly, never the project wrapper (see
  // docs/standards/i18n.md).
  const tp = useIntlTranslations("offline");
  const percent = total > 0 ? Math.round((cached / total) * 100) : 0;
  const num = (value: number) => toLocaleNumeral(value, locale);

  return (
    <>
      <div
        className={`overflow-hidden rounded-full bg-background ${size === "sm" ? "h-1.5" : "h-2"}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={tp("progress", { cached: num(cached), total: num(total) })}
      >
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={`text-muted-foreground ${size === "sm" ? "text-xs" : "text-sm"}`}
      >
        {tp("progress", { cached: num(cached), total: num(total) })}
      </p>
    </>
  );
};
