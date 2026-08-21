"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  Check,
  ChevronRight,
  Download,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReciterCombobox } from "@components/recitation/ReciterCombobox";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useRecitationDownload } from "@/app/hooks/use-recitation-download";
import { useOnlineStatus } from "@hooks/use-online-status";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import useTranslations from "@hooks/use-translations";
import { getLanguageDirection, toLocaleNumeral } from "@utils/i18n";
import { RecitationDownloadItem } from "@/app/types/recitation";
import { SurahResult } from "@/app/types";

const JUZ_COUNT = 30;
const bytesToMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

type RowState = "idle" | "downloading" | "downloaded" | "failed";

const RowIcon = ({
  state,
  onDownload,
  label,
  disabled,
}: {
  state: RowState;
  onDownload: () => void;
  label: string;
  disabled: boolean;
}) => {
  if (state === "downloading") {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }
  if (state === "downloaded") {
    return <Check className="size-4 text-primary" strokeWidth={2} />;
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onDownload}
      disabled={disabled}
      className="fq-chrome-btn fq-focus-ring size-8 disabled:opacity-50 disabled:pointer-events-none"
    >
      {state === "failed" ? (
        <RotateCcw className="size-4" strokeWidth={1.8} />
      ) : (
        <Download className="size-4" strokeWidth={1.8} />
      )}
    </button>
  );
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
    <span className="truncate text-sm text-foreground">{label}</span>
    {children}
  </div>
);

export const OfflineRecitationSheet = () => {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = getLanguageDirection(locale) === "rtl";
  const isOnline = useOnlineStatus();
  const { reciters, chapters, settings, updateSettings, play } = useRecitation();
  const { downloads, downloadSurah, downloadJuz, deleteDownload, getItemState } =
    useRecitationDownload();

  const [open, setOpen] = useState(false);
  const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);
  const pendingPlayRef = useRef<RecitationDownloadItem | null>(null);
  useCloseOnBackGesture(open, () => setOpen(false));

  const reciterId = settings.reciterId ?? reciters[0]?.id ?? null;
  const reciter = reciters.find((r) => r.id === reciterId);

  // A downloaded item may belong to a different reciter than the one
  // currently selected — play() always reads settings.reciterId, it takes no
  // reciter argument, so a mismatch is synced first and the actual play()
  // call is deferred to the next render, once `play`'s closure has picked up
  // the new reciterId (ADR 0046).
  useEffect(() => {
    const pending = pendingPlayRef.current;
    if (pending && settings.reciterId === pending.reciterId) {
      pendingPlayRef.current = null;
      play(pending.startVerseKey, {
        stopVerseKey: pending.stopVerseKey,
        stopChapterId: pending.stopChapterId,
        rangeRepeatCount: 1,
        id: `download:${pending.kind}:${pending.key}`,
        label: pending.label,
      });
      setOpen(false);
    }
  }, [settings.reciterId, play]);

  const handlePlay = (item: RecitationDownloadItem) => {
    if (settings.reciterId !== item.reciterId) {
      pendingPlayRef.current = item;
      updateSettings({ reciterId: item.reciterId });
      return;
    }
    play(item.startVerseKey, {
      stopVerseKey: item.stopVerseKey,
      stopChapterId: item.stopChapterId,
      rangeRepeatCount: 1,
      id: `download:${item.kind}:${item.key}`,
      label: item.label,
    });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-start"
        >
          <span className="text-sm font-medium text-foreground">
            {t("offlineRecitation.title", "Offline Recitation")}
          </span>
          <ChevronRight className={isRTL ? "size-4 rotate-180 text-muted-foreground" : "size-4 text-muted-foreground"} />
        </button>
      </SheetTrigger>
      <SheetContent ref={setSheetContentEl} side={isRTL ? "left" : "right"} dir={getLanguageDirection(locale)}>
        <SheetHeader>
          <SheetTitle>{t("offlineRecitation.title", "Offline Recitation")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t(
              "offlineRecitation.description",
              "Download a surah or juz' for offline listening.",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-6 mt-2 overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("recitation.reciter", "Reciter")}
            </h3>
            <ReciterCombobox
              reciters={reciters}
              value={reciterId}
              onChange={(id) => updateSettings({ reciterId: id })}
              portalContainer={sheetContentEl}
              trigger={({ selected, open: comboboxOpen }) => (
                <button
                  type="button"
                  aria-expanded={comboboxOpen}
                  className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5 text-start"
                >
                  <span className="truncate text-sm text-foreground">
                    {selected?.translatedName ?? t("recitation.reciterPlaceholder", "Choose a reciter")}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )}
            />
          </div>

          {!isOnline ? (
            <p className="text-xs text-muted-foreground">
              {t("offlineRecitation.offlineNotice", "Connect to the internet to download.")}
            </p>
          ) : null}

          <Tabs defaultValue="surah">
            <TabsList className="w-full">
              <TabsTrigger value="surah" className="flex-1">
                {t("offlineRecitation.bySurah", "By Surah")}
              </TabsTrigger>
              <TabsTrigger value="juz" className="flex-1">
                {t("offlineRecitation.byJuz", "By Juz")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="surah" className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {chapters.map((surah: SurahResult) => {
                const state = reciterId ? getItemState("surah", surah.id, reciterId) : "idle";
                return (
                  <Row key={surah.id} label={surah.name_simple}>
                    <RowIcon
                      state={state}
                      label={t("offlineRecitation.download", "Download")}
                      disabled={!isOnline || !reciterId}
                      onDownload={() => {
                        if (!reciterId || !isOnline) return;
                        downloadSurah(surah, reciterId, reciter?.translatedName ?? "");
                      }}
                    />
                  </Row>
                );
              })}
            </TabsContent>

            <TabsContent value="juz" className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((juzNumber) => {
                const state = reciterId ? getItemState("juz", juzNumber, reciterId) : "idle";
                return (
                  <Row
                    key={juzNumber}
                    label={`${t("juz", "Juz")} ${toLocaleNumeral(juzNumber, locale)}`}
                  >
                    <RowIcon
                      state={state}
                      label={t("offlineRecitation.download", "Download")}
                      disabled={!isOnline || !reciterId}
                      onDownload={() => {
                        if (!reciterId || !isOnline) return;
                        downloadJuz(juzNumber, chapters, reciterId, reciter?.translatedName ?? "");
                      }}
                    />
                  </Row>
                );
              })}
            </TabsContent>
          </Tabs>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("offlineRecitation.downloaded", "Downloaded")}
            </h3>
            {downloads.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">
                {t("offlineRecitation.noneDownloaded", "Nothing downloaded yet.")}
              </p>
            ) : (
              <div className="space-y-2">
                {downloads.map((item) => (
                  <div
                    key={`${item.kind}:${item.reciterId}:${item.key}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {toLocaleNumeral(bytesToMb(item.sizeBytes), locale)} {t("offlineRecitation.mb", "MB")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("recitation.listen", "Listen")}
                      onClick={() => handlePlay(item)}
                    >
                      <Play className="size-4" strokeWidth={1.8} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      aria-label={t("offlineRecitation.delete", "Delete")}
                      onClick={() => deleteDownload(item)}
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
