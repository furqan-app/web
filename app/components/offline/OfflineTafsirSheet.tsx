"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  ChevronRight,
  CloudDownload,
  HardDrive,
  Loader2,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { OfflineProgressBar } from "@components/offline/OfflineProgressBar";
import { useTafsirDownload } from "@hooks/use-tafsir-download";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { useQuranMushaf } from "@contexts/QuranMushafContext";
import { useOnlineStatus } from "@hooks/use-online-status";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import { getLanguageDirection, toLocaleNumeral } from "@utils/i18n";
import { TAFSIR_EDITIONS } from "@/app/constants/tafsir";
import {
  OFFLINE_DOWNLOAD_MB,
  TAFSIR_TOTAL_CHAPTERS,
} from "@/app/constants/offline";
import { TafsirEdition } from "@/app/types/tafsir";

const bytesToMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

export const OfflineTafsirSheet = () => {
  const locale = useLocale();
  const t = useTranslations("offlineTafsir");
  const isRTL = getLanguageDirection(locale) === "rtl";

  const [open, setOpen] = useState(false);
  useCloseOnBackGesture(open, () => setOpen(false));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="fq-section-row fq-focus-ring w-full text-start">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{t("title")}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{t("description")}</p>
          </div>
          <ChevronRight
            className={
              isRTL
                ? "size-4 rotate-180 text-[hsl(var(--control-inert))]"
                : "size-4 text-[hsl(var(--control-inert))]"
            }
          />
        </button>
      </SheetTrigger>
      <SheetContent
        side={isRTL ? "left" : "right"}
        dir={getLanguageDirection(locale)}
        className="w-full sm:max-w-[408px] gap-0 p-0 flex flex-col"
      >
        <SheetHeader className="shrink-0 px-5 pb-3.5 pt-5 border-b border-border/70 text-start">
          <SheetTitle className="text-[15px] font-semibold leading-none text-foreground">
            {t("title")}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("description")}</SheetDescription>
        </SheetHeader>
        <OfflineTafsirSheetBody />
      </SheetContent>
    </Sheet>
  );
};

/**
 * Rendered only while the Sheet is open (Radix unmounts closed content), so the
 * `usePwaPrecache` instance below fires no launch-time status chatter — the cost
 * #440 removed from always-mounted surfaces.
 */
const OfflineTafsirSheetBody = () => {
  const locale = useLocale();
  const t = useTranslations("offlineTafsir");
  const isOnline = useOnlineStatus();
  const num = (value: number) => toLocaleNumeral(value, locale);

  const { downloads, downloadEdition, deleteEdition, getEditionState, getProgress } =
    useTafsirDownload();

  const { mushafId: activeMushafId } = useQuranMushaf();
  const mushaf = usePwaPrecache(activeMushafId);
  const mushafNeedsDownload = mushaf.state === "idle" || mushaf.state === "partial";
  const [alsoMushaf, setAlsoMushaf] = useState(false);
  const mushafStartedRef = useRef(false);

  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.storage?.estimate) return;
        const { quota = 0, usage = 0 } = await navigator.storage.estimate();
        if (!cancelled) setFreeBytes(Math.max(quota - usage, 0));
      } catch {
        /* estimate unavailable — leave the space line hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const freeMb = freeBytes === null ? null : Math.round(freeBytes / 1024 / 1024);

  const sizeOf = (editionId: number) =>
    downloads.find((d) => d.editionId === editionId)?.sizeBytes;

  const handleDownload = (edition: TafsirEdition) => {
    if (!isOnline) return;
    if (alsoMushaf && mushafNeedsDownload && !mushafStartedRef.current) {
      mushafStartedRef.current = true;
      mushaf.start();
    }
    downloadEdition(edition);
  };

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
      {!isOnline && (
        <p className="text-xs text-muted-foreground">{t("offlineNotice")}</p>
      )}

      {freeMb !== null && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HardDrive className="size-3.5 shrink-0" strokeWidth={1.8} />
          {t("spaceAvailable", { size: num(freeMb) })}
        </p>
      )}

      {mushafNeedsDownload && (
        <label className="fq-section-row flex cursor-pointer items-center gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium leading-tight text-foreground">
              {t("alsoMushafLabel")}
            </span>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {t("alsoMushafHint", { size: num(OFFLINE_DOWNLOAD_MB) })}
            </p>
          </div>
          <Switch
            checked={alsoMushaf}
            onCheckedChange={setAlsoMushaf}
            aria-label={t("alsoMushafLabel")}
          />
        </label>
      )}

      <div className="space-y-2">
        {TAFSIR_EDITIONS.map((edition) => {
          const state = getEditionState(edition.id);
          const cached = getProgress(edition.id);
          const stored = sizeOf(edition.id);
          const storedMb =
            stored !== undefined ? bytesToMb(stored) : edition.downloadSizeMb;
          const needsRetry = state === "failed" || state === "quota-exceeded";

          return (
            <div
              key={edition.id}
              className="rounded-lg bg-muted px-3 py-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{edition.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {state === "quota-exceeded"
                      ? freeMb !== null
                        ? `${t("notEnoughSpace")} · ${t("spaceAvailable", { size: num(freeMb) })}`
                        : t("notEnoughSpace")
                      : storedMb !== undefined
                        ? `${edition.authorName} · ${t("sizeMb", { size: num(storedMb) })}`
                        : edition.authorName}
                  </p>
                </div>

                {state === "downloading" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                ) : state === "downloaded" ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Check className="size-4 text-primary" strokeWidth={2} />
                    <button
                      type="button"
                      aria-label={t("delete")}
                      onClick={() => deleteEdition(edition.id)}
                      className="fq-chrome-btn fq-focus-ring flex size-11 items-center justify-center text-destructive"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={needsRetry ? t("retry") : t("download")}
                    onClick={() => handleDownload(edition)}
                    disabled={!isOnline}
                    className="fq-chrome-btn fq-focus-ring flex size-11 shrink-0 items-center justify-center disabled:pointer-events-none disabled:opacity-50"
                  >
                    {state === "quota-exceeded" ? (
                      <TriangleAlert className="size-4 text-destructive" strokeWidth={1.8} />
                    ) : state === "failed" ? (
                      <RotateCcw className="size-4" strokeWidth={1.8} />
                    ) : (
                      <CloudDownload className="size-4" strokeWidth={1.8} />
                    )}
                  </button>
                )}
              </div>

              {state === "downloading" && (
                <OfflineProgressBar
                  cached={cached}
                  total={TAFSIR_TOTAL_CHAPTERS}
                  size="sm"
                  label={t("progress", {
                    cached: num(cached),
                    total: num(TAFSIR_TOTAL_CHAPTERS),
                  })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
