import { useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { Bookmark, BookOpen, Eraser, User, Volume1, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { useOnlineStatus } from "../hooks/use-online-status";
import { VerseForMark, WordWithVerse } from "../types/prisma";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useTafsirModal } from "@/app/contexts/TafsirContext";
import { getWordAudioUrl } from "../constants/word-audio";
import { addPageMark } from "../server/actions/addPageMark";
import { deletePageMark } from "../server/actions/deletePageMark";
import useTranslations from "../hooks/use-translations";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import { getSurahMeta, normalizeVerseKey } from "@/app/utils/quran-navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";

const COMMENT_MAX_LENGTH = 500;

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | VerseForMark;
  verseDisplayText?: string;
  // The current mark's category key + optional comment, when this spot is
  // already marked (ADR 0025 — one mark per spot).
  currentCategory?: string;
  currentComment?: string;
  // Author of the mark, shown only when it wasn't made by the current viewer
  // (e.g. a teacher's mark on a student's mushaf). See ADR 0012.
  authorName?: string | null;
  // When set, add/remove operate on the granted mushaf instead of the viewer's.
  grantId?: string;
};

const MarkedByLine = ({ authorName }: { authorName?: string | null }) => {
  const t = useTranslations();

  if (!authorName) return null;

  return (
    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-xs text-muted-foreground border border-border/60">
      <User className="size-3" strokeWidth={1.8} />
      <span>
        {t("markModal.markedBy", "Marked by")} {authorName}
      </span>
    </div>
  );
};

const getTitle = (
  markFor: WordWithVerse | VerseForMark,
  verseDisplayText?: string,
) => {
  if ("location" in markFor) {
    return markFor.qpc_uthmani_hafs;
  }

  // Verse-level mark: the caller (QuranSafha.selectWord) always supplies
  // verseDisplayText (built from the verse's words), so the full verse text no
  // longer travels on every page word — see ADR 0028 / VerseForMark.
  return verseDisplayText ?? "";
};

export function MarkModal({
  isOpen,
  close,
  markFor,
  verseDisplayText,
  currentCategory,
  currentComment,
  authorName,
  grantId,
}: ModalProps) {
  const { reload: reloadMarks } = useMarks([markFor.page_number], grantId);
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const t = useTranslations();
  const locale = useLocale();
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [comment, setComment] = useState(currentComment ?? "");
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { play, status: recitationStatus, togglePlayPause } = useRecitation();
  const { openTafsir } = useTafsirModal();
  useCloseOnBackGesture(isOpen, close);
  const wordAudioRef = useRef<HTMLAudioElement>(null);

  const isWord = "location" in markFor;
  // The comment box only opens once a category is chosen — a comment always
  // attaches to a mark (ADR 0025); "Other" is the comment-only escape hatch.
  const canComment = !!selectedCategory && !isOffline;

  // Header metadata resolution
  const normalizedVerseKey = normalizeVerseKey(markFor.verse_key) ?? "1:1";
  const [surahStr, ayahStr] = normalizedVerseKey.split(":");
  const surahNum = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);
  const surahMeta = getSurahMeta(surahNum);
  const surahName = surahMeta
    ? locale === "ar"
      ? surahMeta.nameArabic
      : surahMeta.nameSimple
    : "";
  const localizedAyah = toLocaleNumeral(ayahNum, locale);

  const playFromHere = () => {
    play(markFor.verse_key);
    close();
  };

  const viewTafsir = () => {
    const snippet =
      verseDisplayText ||
      ("text_uthmani" in markFor && typeof markFor.text_uthmani === "string"
        ? markFor.text_uthmani
        : undefined);
    openTafsir(markFor.verse_key, snippet);
    close();
  };

  const playWordPronunciation = () => {
    if (!isWord || !markFor.audio_url) return;
    if (recitationStatus === "playing") togglePlayPause();

    const audio = wordAudioRef.current;
    if (!audio) return;
    audio.src = getWordAudioUrl(markFor.audio_url);
    audio.currentTime = 0;
    audio.play();
  };

  const saveMark = async () => {
    if (!selectedCategory) return;
    setError(false);
    const added = await addPageMark(
      {
        marked_type: isWord ? "word" : "verse",
        marked_id: isWord ? markFor.location : markFor.verse_key,
        category: selectedCategory,
        comment: comment.trim() || null,
        page_number: markFor.page_number,
      },
      grantId,
    );

    if (added) {
      reloadMarks();
      close();
    } else {
      setError(true);
    }
  };

  const removeMark = async () => {
    setError(false);
    const removed = await deletePageMark(
      {
        marked_type: isWord ? "word" : "verse",
        marked_id: isWord ? markFor.location : markFor.verse_key,
        page_number: markFor.page_number,
      },
      grantId,
    );

    if (removed) {
      reloadMarks();
      close();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        hideDefaultClose
        dir={getLanguageDirection(locale)}
        className="fq-panel-cast w-full max-w-sm sm:max-w-md bg-card rounded-2xl overflow-hidden p-4 sm:p-5 gap-3"
      >
        {/* In-flow header row: Surah/Ayah & type badge + Close Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-tight">
            <span>
              {isWord
                ? t("markModal.markWordLabel", "Mark word")
                : t("markModal.markVerseLabel", "Mark verse")}
            </span>
            <span className="opacity-40">·</span>
            <span>
              {surahName} {localizedAyah}
            </span>
          </div>
          <DialogClose
            className="fq-focus-ring rounded-full p-1.5 text-muted-foreground opacity-70 transition-[opacity,background-color,color] duration-150 hover:opacity-100 hover:bg-accent hover:text-accent-foreground active:scale-90 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Scripture Display */}
        <div className="flex flex-col items-center justify-center text-center py-1.5 px-1">
          <div className="flex items-center justify-center gap-2 max-w-full">
            <DialogTitle
              className="text-foreground text-base font-medium leading-relaxed tracking-normal font-uthmanic select-text"
              dir="rtl"
            >
              {getTitle(markFor, verseDisplayText)}
            </DialogTitle>
            {isWord && markFor.audio_url ? (
              <button
                type="button"
                onClick={playWordPronunciation}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground bg-muted/60 hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all duration-150"
                aria-label={t("markModal.playPronunciation", "Hear pronunciation")}
              >
                <Volume1 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
          <MarkedByLine authorName={authorName} />
          <DialogDescription className="sr-only">
            {isWord
              ? t("markModal.markWordLabel", "Mark word")
              : t("markModal.markVerseLabel", "Mark verse")}
          </DialogDescription>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={playFromHere}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium border border-border/80 bg-card/60 text-foreground hover:bg-accent active:scale-[0.97] transition-all duration-150"
          >
            <Volume2 className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
            <span className="truncate">{t("markModal.playFromHere", "Play from here")}</span>
          </button>
          <button
            type="button"
            onClick={viewTafsir}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium border border-border/80 bg-card/60 text-foreground hover:bg-accent active:scale-[0.97] transition-all duration-150"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
            <span className="truncate">{t("markModal.viewTafsir", "Tafsir")}</span>
          </button>
        </div>

        {/* Category Picker & Note Area */}
        {isAuthenticated ? (
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 text-start">
                {t("markModal.chooseCategoryLabel", "Choose a category")}
              </p>
              <MarkerColorPicker
                value={selectedCategory}
                onChange={setSelectedCategory}
                disabled={isOffline}
              />
            </div>

            <div className={cn("space-y-1", !canComment && "opacity-60")}>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={!canComment}
                aria-label={t("markModal.commentPlaceholder", "Add a comment (optional)…")}
                placeholder={
                  selectedCategory
                    ? t("markModal.commentPlaceholder", "Add a comment (optional)…")
                    : t("markModal.commentDisabledHint", "Choose a category to add a comment")
                }
                dir={getLanguageDirection(locale)}
                className="bg-card text-start min-h-[75px] resize-none text-xs sm:text-sm placeholder:text-muted-foreground rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
              />
              <p className="text-end text-[10px] text-muted-foreground">
                {comment.length}/{COMMENT_MAX_LENGTH}
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={saveMark}
                disabled={!selectedCategory || isOffline}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium bg-primary text-primary-foreground transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-xs"
              >
                <Bookmark className="w-4 h-4" strokeWidth={1.8} />
                {t("markModal.saveMark", "Save Mark")}
              </button>
              {currentCategory ? (
                <button
                  type="button"
                  onClick={removeMark}
                  disabled={isOffline}
                  className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Eraser className="w-4 h-4" strokeWidth={1.8} />
                  {t("markModal.removeMark", "Remove Mark")}
                </button>
              ) : null}
            </div>

            {isOffline ? (
              <p className="text-xs text-muted-foreground text-center">
                {t(
                  "markModal.offlineNotice",
                  "Connect to the internet to view or add marks",
                )}
              </p>
            ) : error ? (
              <p className="text-xs text-destructive text-center">
                {t("markModal.actionError", "Something went wrong. Try again.")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border/80 p-4 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t("markModal.signInToMark", "Sign in to mark words and verses")}
            </p>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6"
              onClick={() => signIn()}
            >
              {t("signIn", "Sign in")}
            </Button>
          </div>
        )}
        {isWord ? <audio ref={wordAudioRef} preload="none" /> : null}
      </DialogContent>
    </Dialog>
  );
}

