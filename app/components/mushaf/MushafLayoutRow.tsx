"use client";

import { useLocale, useTranslations as useIntlTranslations } from "next-intl";
import {
  Check,
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
import { cn } from "@/lib/utils";

type Props = {
  mushafId: number;
  onSelect?: () => void;
};

export const MushafLayoutRow = ({ mushafId, onSelect }: Props) => {
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
          ? null
          : failed > 0
            ? tp("partialBody", { cached: num(cached), total: num(total), failed: num(failed) })
            : hasPartialProgress
              ? tp("resumeProgress", { cached: num(cached), total: num(total) })
              : tp("sizeNotice", { size: num(edition.downloadSizeMb) });

  const handleSelect = () => {
    setMushafId(mushafId);
    onSelect?.();
  };

  return (
    <div className="fq-section-row flex-col !items-stretch gap-2 py-2.5 px-6 hover:bg-[hsl(var(--well)/0.3)] transition-colors">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSelect}
          className="flex-1 min-w-0 text-start"
        >
          <p
            className={cn(
              "text-xs font-medium leading-tight",
              isActive ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {name}
          </p>
          {statusText && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{statusText}</p>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {showDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 active:scale-[0.97] transition-transform duration-150"
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
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  strokeWidth={1.8}
                />
              ) : state === "done" ? (
                <Check className="size-3.5 text-primary" strokeWidth={2} />
              ) : state === "offline" ? (
                <CloudOff className="size-3.5" strokeWidth={1.8} />
              ) : state === "partial" ? (
                <TriangleAlert className="size-3.5" strokeWidth={1.8} />
              ) : (
                <CloudDownload className="size-3.5" strokeWidth={1.8} />
              )}
            </Button>
          )}
          {isActive ? (
            <span
              className="size-4 rounded-full bg-primary grid place-items-center text-primary-foreground"
              aria-label={t("mushafLayout.active", "Active")}
            >
              <Check className="size-2.5 stroke-[3]" />
            </span>
          ) : (
            <button
              type="button"
              className="size-4 rounded-full border border-border"
              onClick={handleSelect}
              aria-label={t("mushafLayout.switchAction", "Switch to this layout")}
            />
          )}
        </div>
      </div>
      {showDownload && state === "running" && (
        <OfflineProgressBar cached={cached} total={total} size="sm" />
      )}
    </div>
  );
};
