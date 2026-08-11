"use client";

import { useLocale, useTranslations as useIntlTranslations } from "next-intl";
import { CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { OFFLINE_DOWNLOAD_MB } from "@constants/offline";
import { usePwaPrecache } from "@hooks/use-pwa-precache";

/**
 * Settings row for offline availability — the permanent recovery path for anyone
 * who skipped the first-run gate or the post-install prompt.
 *
 * Deliberately a status row plus a button, not an ambient progress bar: progress
 * belongs to whichever surface started the download, and a bar that is always
 * creeping along in Settings was the thing this replaced (ADR 0014 Addendum 2).
 * The bar below appears only while a download is actually in flight.
 */
export const OfflineAccessSection = () => {
  const locale = useLocale();
  const t = useTranslations();
  // Parameterized keys must go through next-intl directly — see the note in
  // OfflineDownloadPanel and docs/plans/fix-viewing-chip-intl-interpolation.md.
  const tp = useIntlTranslations("offline");
  const { isStandalone, state, cached, total, isOnline, start } =
    usePwaPrecache();

  if (!isStandalone) return null;
  if (state === "unknown") return null;

  const num = (value: number) => toLocaleNumeral(value, locale);

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {t("offlineAccess", "Offline Access")}
      </h3>
      <div className="p-4 rounded-lg bg-muted space-y-2">
        {state === "done" ? (
          <p className="text-sm font-medium">
            {t("offline.ready", "The Quran is available offline")}
          </p>
        ) : state === "running" ? (
          <>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{
                  width: `${total > 0 ? (cached / total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {tp("progress", { cached: num(cached), total: num(total) })}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">
              {t("offline.notDownloaded", "Not available offline")}
            </p>
            <p className="text-xs text-muted-foreground">
              {state === "offline"
                ? t(
                    "offline.offlineBody",
                    "Connect to the internet to download the Quran for offline reading.",
                  )
                : tp("sizeNotice", { size: num(OFFLINE_DOWNLOAD_MB) })}
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              disabled={!isOnline}
              onClick={start}
            >
              <CloudDownload className="size-4" strokeWidth={1.8} />
              {tp("downloadWithSize", { size: num(OFFLINE_DOWNLOAD_MB) })}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
