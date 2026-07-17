import { useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Verse } from "@/app/generated/quran-client";
import { Bookmark, Eraser, User, Volume1, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { useOnlineStatus } from "../hooks/use-online-status";
import { WordWithVerse } from "../types/prisma";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { getWordAudioUrl } from "../constants/word-audio";
import { addPageMark } from "../server/actions/addPageMark";
import { deletePageMark } from "../server/actions/deletePageMark";
import useTranslations from "../hooks/use-translations";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COMMENT_MAX_LENGTH = 500;

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | Verse;
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
    <p className="mb-2.5 flex items-center gap-1 text-xs text-muted-foreground">
      <User className="size-3" strokeWidth={1.8} />
      <span>
        {t("markModal.markedBy", "Marked by")} {authorName}
      </span>
    </p>
  );
};

const getTitle = (
  markFor: WordWithVerse | Verse,
  verseDisplayText?: string,
) => {
  if ("location" in markFor) {
    return markFor.qpc_uthmani_hafs;
  }

  return verseDisplayText ?? markFor.text_uthmani;
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
  const { reload: reloadMarks } = useMarks(markFor.page_number, grantId);
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const t = useTranslations();
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [comment, setComment] = useState(currentComment ?? "");
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { play, status: recitationStatus, togglePlayPause } = useRecitation();
  const wordAudioRef = useRef<HTMLAudioElement>(null);

  const isWord = "location" in markFor;
  // The comment box only opens once a category is chosen — a comment always
  // attaches to a mark (ADR 0025); "Other" is the comment-only escape hatch.
  const canComment = !!selectedCategory && !isOffline;

  const playFromHere = () => {
    play(markFor.verse_key);
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
        className="w-full max-w-sm bg-card rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] overflow-hidden p-4 gap-3"
      >
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {isWord
                ? t("markModal.markWordLabel", "Mark word")
                : t("markModal.markVerseLabel", "Mark verse")}
            </p>
            <DialogClose className="rounded-full p-1.5 text-muted-foreground opacity-70 ring-offset-background transition-[opacity,background-color,color] duration-150 hover:opacity-100 hover:bg-accent hover:text-accent-foreground active:scale-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <DialogTitle
              className="flex text-foreground text-xl font-medium leading-normal tracking-normal"
              style={{ fontFamily: "var(--uthmanic)" }}
              dir="rtl"
            >
              {getTitle(markFor, verseDisplayText)}
            </DialogTitle>
            {isWord && markFor.audio_url ? (
              <button
                type="button"
                onClick={playWordPronunciation}
                className="rounded-full p-1.5 text-muted-foreground opacity-70 transition-[opacity,background-color,color] duration-150 hover:opacity-100 hover:bg-accent hover:text-accent-foreground active:scale-90"
              >
                <Volume1 className="h-4 w-4" strokeWidth={1.8} />
                <span className="sr-only">
                  {t("markModal.playPronunciation", "Hear pronunciation")}
                </span>
              </button>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            {isWord
              ? t("markModal.markWordLabel", "Mark word")
              : t("markModal.markVerseLabel", "Mark verse")}
          </DialogDescription>
        </div>
        <button
          type="button"
          onClick={playFromHere}
          className="mb-3 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium border border-border text-foreground hover:bg-accent active:scale-[0.97] transition-[background-color,transform] duration-150"
        >
          <Volume2 className="w-4 h-4" strokeWidth={1.8} />
          {t("markModal.playFromHere", "Play from here")}
        </button>

        {isAuthenticated ? (
          <div className="rounded-xl bg-muted border border-border/60 p-2.5">
            <MarkedByLine authorName={authorName} />
            <p className="text-xs font-medium text-muted-foreground mb-2.5">
              {t("markModal.chooseCategoryLabel", "Choose a category")}
            </p>
            <MarkerColorPicker
              value={selectedCategory}
              onChange={setSelectedCategory}
              disabled={isOffline}
            />

            <div className={cn("mt-3", !canComment && "opacity-50")}>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={!canComment}
                placeholder={
                  selectedCategory
                    ? t("markModal.commentPlaceholder", "Add a comment (optional)…")
                    : t("markModal.commentDisabledHint", "Choose a category to add a comment")
                }
                dir="auto"
                className="bg-card min-h-[80px] resize-none"
              />
              <p className="mt-1 text-end text-[10px] text-muted-foreground">
                {comment.length}/{COMMENT_MAX_LENGTH}
              </p>
            </div>

            <button
              onClick={saveMark}
              disabled={!selectedCategory || isOffline}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium bg-primary text-primary-foreground transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Bookmark className="w-4 h-4" strokeWidth={1.8} />
              {t("markModal.saveMark", "Save Mark")}
            </button>
            {currentCategory ? (
              <button
                onClick={removeMark}
                disabled={isOffline}
                className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Eraser className="w-4 h-4" strokeWidth={1.8} />
                {t("markModal.removeMark", "Remove Mark")}
              </button>
            ) : null}
            {isOffline ? (
              <p className="mt-1.5 text-xs text-muted-foreground text-center">
                {t(
                  "markModal.offlineNotice",
                  "Connect to the internet to view or add marks",
                )}
              </p>
            ) : error ? (
              <p className="mt-1.5 text-xs text-destructive text-center">
                {t("markModal.actionError", "Something went wrong. Try again.")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl bg-muted border border-border/60 p-2.5 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {t("markModal.signInToMark", "Sign in to mark words and verses")}
            </p>
            <Button
              className="bg-green-700 hover:bg-green-600 text-white"
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
