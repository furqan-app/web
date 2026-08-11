"use client";

import { useLocale, useTranslations as useIntlTranslations } from "next-intl";
import { BookOpenCheck, CloudDownload, TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { OFFLINE_DOWNLOAD_MB } from "@constants/offline";
import type { PrecacheState } from "@hooks/use-pwa-precache";

type Props = {
  state: PrecacheState;
  cached: number;
  total: number;
  onDownload: () => void;
  onDismiss: () => void;
  /** "Skip for now" on the first-run gate, "Not now" on the in-tab prompt. */
  dismissLabel: string;
  /** The gate leads with a headline; the in-tab prompt leads with its own. */
  title: string;
  /**
   * Optional sentence shown before the size notice. Must contain no `{...}`
   * placeholders — it is built by the parent, which renders on the server, and
   * next-intl parses braces as ICU arguments and throws when they are unfilled.
   */
  leadIn?: string;
};

/**
 * The shared body of every offline-download surface — the first-run gate and the
 * in-tab install prompt render the same state machine, differing only in their
 * framing and dismiss wording.
 */
export const OfflineDownloadPanel = ({
  state,
  cached,
  total,
  onDownload,
  onDismiss,
  dismissLabel,
  title,
  leadIn,
}: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  // Parameterized keys go through next-intl directly, never the project wrapper
  // + `.replace()`: that wrapper calls `t(key)` with no values, so next-intl's
  // ICU pass fails, returns the key path, and the wrapper then silently serves
  // the English default — the Arabic string never renders. Same bug as
  // docs/plans/fix-viewing-chip-intl-interpolation.md; same fix.
  const tp = useIntlTranslations("offline");
  // Values are pre-converted to strings so ICU substitutes them verbatim and the
  // Eastern Arabic numeral policy is preserved instead of ICU's own formatting.
  const num = (value: number) => toLocaleNumeral(value, locale);

  if (state === "offline") {
    return (
      <div className="space-y-4 text-center">
        <WifiOff
          className="mx-auto size-8 text-muted-foreground"
          strokeWidth={1.6}
        />
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold">
            {t("offline.offlineTitle", "You're offline")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "offline.offlineBody",
              "Connect to the internet to download the Quran for offline reading.",
            )}
          </p>
        </div>
        <Button variant="ghost" className="w-full" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    );
  }

  if (state === "running") {
    const percent = total > 0 ? Math.round((cached / total) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="space-y-1.5 text-center">
          <h2 className="text-base font-semibold">
            {t("offline.runningTitle", "Downloading the Quran")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tp("progress", { cached: num(cached), total: num(total) })}
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <Button variant="ghost" className="w-full" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    );
  }

  if (state === "partial") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5 text-center">
          <TriangleAlert
            className="mx-auto size-8 text-muted-foreground"
            strokeWidth={1.6}
          />
          <h2 className="text-base font-semibold">
            {t("offline.partialTitle", "Some pages couldn't be downloaded")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tp("partialBody", { cached: num(cached), total: num(total) })}
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full" onClick={onDownload}>
            {t("offline.retry", "Try again")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onDismiss}>
            {t("offline.continueAnyway", "Continue anyway")}
          </Button>
        </div>
      </div>
    );
  }

  // `idle` — the only state that offers the download, and only on a tap.
  const sizeNotice = tp("sizeNotice", { size: num(OFFLINE_DOWNLOAD_MB) });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 text-center">
        <BookOpenCheck className="mx-auto size-8 text-primary" strokeWidth={1.6} />
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {leadIn ? `${leadIn} ${sizeNotice}` : sizeNotice}
        </p>
      </div>
      <div className="space-y-2">
        <Button className="w-full gap-2" onClick={onDownload}>
          <CloudDownload className="size-4" strokeWidth={1.8} />
          {t("offline.download", "Download")}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onDismiss}>
          {dismissLabel}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t(
            "offline.settingsHint",
            "You can download it later from Settings.",
          )}
        </p>
      </div>
    </div>
  );
};
