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
    <div className="fq-section-drawer-row flex-col !items-stretch gap-1.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSelect}
          className="flex-1 min-w-0 text-start"
        >
          <p
            className={cn(
              "text-[12px] font-medium leading-tight",
              isActive ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {name}
          </p>
          {statusText && (
            <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{statusText}</p>
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
          <span
            className="fq-radio-circle"
            data-state={isActive ? "checked" : "unchecked"}
            onClick={!isActive ? handleSelect : undefined}
            role={!isActive ? "button" : undefined}
            aria-label={
              isActive
                ? t("mushafLayout.active", "Active")
                : t("mushafLayout.switchAction", "Switch to this layout")
            }
          >
            {isActive && <Check className="size-2.5 stroke-[3]" />}
          </span>
        </div>
      </div>
      {showDownload && state === "running" && (
        <OfflineProgressBar cached={cached} total={total} size="sm" />
      )}
    </div>
  );
};
