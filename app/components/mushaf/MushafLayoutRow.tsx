"use client";

import { useLocale, useTranslations as useIntlTranslations } from "next-intl";
import {
  CheckCircle2,
  Circle,
  CloudDownload,
  CloudOff,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { useQuranMushaf } from "@contexts/QuranMushafContext";
import { getMushafEdition } from "@utils/mushaf-editions";
import { OfflineProgressBar } from "@components/offline/OfflineProgressBar";

type Props = { mushafId: number };

/**
 * One row of the "Mushaf Layout" Settings section — two fully independent
 * actions (download for offline, switch the active reading edition). Neither
 * implies the other: switching never requires downloading first (the reader
 * has always rendered any edition on demand over the network), and
 * downloading never changes the active edition. See
 * docs/plans/mushaf-layout-settings.md.
 *
 * No thumbnail for now (removed per feedback — the generated preview wasn't
 * the expected look). `edition.thumbnailUrl` and the generator script
 * (scripts/generate-mushaf-thumbnails.js) are left in place for a future pass.
 */
export const MushafLayoutRow = ({ mushafId }: Props) => {
  const locale = useLocale();
  const t = useTranslations();
  const tp = useIntlTranslations("offline");
  const tml = useIntlTranslations("mushafLayout");
  const num = (value: number) => toLocaleNumeral(value, locale);

  const edition = getMushafEdition(mushafId);
  const { mushafId: activeMushafId, setMushafId } = useQuranMushaf();
  const isActive = activeMushafId === mushafId;

  const { isStandalone, state, cached, total, failed, start } =
    usePwaPrecache(mushafId);

  const name = tml(`editions.${mushafId}.name`);

  // Only the standalone-installed app ever offers a bulk download (ADR 0014) —
  // the switch action has never been PWA-gated and must not become so.
  const showDownload = isStandalone && state !== "unknown";
  const hasPartialProgress = cached > 0 && cached < total;

  const statusText = !showDownload
    ? null
    : state === "done"
      ? t("offline.ready", "Available offline")
      : state === "offline"
        ? t(
            "offline.offlineBody",
            "Connect to the internet to download the Quran for offline reading.",
          )
        : state === "running"
          ? null // carried by the progress bar below instead
          : failed > 0
            ? tp("partialBody", { cached: num(cached), total: num(total), failed: num(failed) })
            : hasPartialProgress
              ? tp("resumeProgress", { cached: num(cached), total: num(total) })
              : tp("sizeNotice", { size: num(edition.downloadSizeMb) });

  return (
    // A row of the layout group, not its own slab — so the picker holds any
    // number of registered editions without redesign (the mushaf-variant
    // schema is deliberately generic and more print editions are expected).
    <div className="fq-section-row flex-col !items-stretch gap-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{name}</p>
          {statusText && (
            <p className="text-xs text-muted-foreground mt-0.5">{statusText}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 active:scale-[0.97] transition-transform duration-150"
              disabled={state === "done" || state === "running" || state === "offline"}
              onClick={start}
              aria-label={
                state === "done"
                  ? t("mushafLayout.downloaded", "Downloaded")
                  : state === "partial" || hasPartialProgress
                    ? t("offline.resume", "Resume download")
                    : t("offline.download", "Download")
              }
            >
              {state === "running" ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  strokeWidth={1.8}
                />
              ) : state === "done" ? (
                <CheckCircle2 className="size-4 text-primary" strokeWidth={1.8} />
              ) : state === "offline" ? (
                <CloudOff className="size-4" strokeWidth={1.8} />
              ) : state === "partial" ? (
                <TriangleAlert className="size-4" strokeWidth={1.8} />
              ) : (
                <CloudDownload className="size-4" strokeWidth={1.8} />
              )}
            </Button>
          )}
          {isActive ? (
            <span
              className="inline-flex size-8 items-center justify-center"
              aria-label={t("mushafLayout.active", "Active")}
            >
              <CheckCircle2 className="size-5 text-primary" strokeWidth={1.8} />
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 active:scale-[0.97] transition-transform duration-150"
              onClick={() => setMushafId(mushafId)}
              aria-label={t("mushafLayout.switchAction", "Switch to this layout")}
            >
              <Circle className="size-5 text-muted-foreground" strokeWidth={1.8} />
            </Button>
          )}
        </div>
      </div>
      {showDownload && state === "running" && (
        <OfflineProgressBar cached={cached} total={total} size="sm" />
      )}
    </div>
  );
};
