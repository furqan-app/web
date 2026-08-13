"use client";

import { useLocale, useTranslations as useIntlTranslations } from "next-intl";
import { CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { OFFLINE_DOWNLOAD_MB } from "@constants/offline";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import type { PrecacheState } from "@hooks/use-pwa-precache";
import { OfflineProgressBar } from "@components/offline/OfflineProgressBar";

type RowProps = {
  /** Edition label, e.g. "Madani mushaf". */
  label: string;
  sizeMb: number;
  state: PrecacheState;
  cached: number;
  total: number;
  failed: number;
  isOnline: boolean;
  onDownload: () => void;
};

/**
 * One downloadable edition. Extracted as a row so the deferred tajweed download
 * (ADR 0023 keeps it out of the bulk precache for now) is an added row rather
 * than a restructure — the plan promised this shape, so it needs to actually
 * hold.
 */
const OfflineEditionRow = ({
  label,
  sizeMb,
  state,
  cached,
  total,
  failed,
  isOnline,
  onDownload,
}: RowProps) => {
  const locale = useLocale();
  const t = useTranslations();
  // Parameterized keys must go through next-intl directly — see the note in
  // OfflineDownloadPanel and docs/plans/fix-viewing-chip-intl-interpolation.md.
  const tp = useIntlTranslations("offline");
  const num = (value: number) => toLocaleNumeral(value, locale);

  // A cancelled or interrupted run leaves the cache partway done with the
  // sentinel unwritten (state stays "idle"/"partial", never "done") — distinct
  // from a fresh install where nothing has been fetched at all. The resume
  // mechanics already work (ensureCached skips what's cached); this only
  // changes what the row displays so a resumed run isn't mistaken for a
  // restart (ADR 0014 Addendum 3).
  const hasPartialProgress = cached > 0 && cached < total;

  return (
    <div className="p-4 rounded-lg bg-muted space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {state === "done" ? (
        <p className="text-xs text-muted-foreground">
          {t("offline.ready", "Available offline")}
        </p>
      ) : state === "running" ? (
        <OfflineProgressBar cached={cached} total={total} size="sm" />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {state === "offline"
              ? t(
                  "offline.offlineBody",
                  "Connect to the internet to download the Quran for offline reading.",
                )
              : failed > 0
                ? tp("partialBody", {
                    cached: num(cached),
                    total: num(total),
                    failed: num(failed),
                  })
                : hasPartialProgress
                  ? tp("resumeProgress", { cached: num(cached), total: num(total) })
                  : tp("sizeNotice", { size: num(sizeMb) })}
          </p>
          <Button
            size="sm"
            className="w-full gap-2"
            disabled={!isOnline}
            onClick={onDownload}
          >
            <CloudDownload className="size-4" strokeWidth={1.8} />
            {hasPartialProgress
              ? t("offline.resume", "Resume download")
              : tp("downloadWithSize", { size: num(sizeMb) })}
          </Button>
        </>
      )}
    </div>
  );
};

/**
 * Settings section for offline availability — the permanent recovery path for
 * anyone who skipped the first-run gate or the post-install prompt.
 *
 * Deliberately a status row plus a button, not an ambient progress bar: progress
 * belongs to whichever surface started the download, and a bar that was always
 * creeping along in Settings on every launch is what this replaced (ADR 0014
 * Addendum 2). The bar appears only while a download is actually in flight.
 */
export const OfflineAccessSection = () => {
  const t = useTranslations();
  const { isStandalone, state, cached, total, failed, isOnline, start } =
    usePwaPrecache();

  if (!isStandalone) return null;
  if (state === "unknown") return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {t("offlineAccess", "Offline Access")}
      </h3>
      <div className="space-y-2">
        <OfflineEditionRow
          label={t("offline.madaniMushaf", "Madani mushaf")}
          sizeMb={OFFLINE_DOWNLOAD_MB}
          state={state}
          cached={cached}
          total={total}
          failed={failed}
          isOnline={isOnline}
          onDownload={start}
        />
      </div>
    </div>
  );
};
