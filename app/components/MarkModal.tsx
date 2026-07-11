import { useState } from "react";
import { Verse } from "@/app/generated/quran-client";
import { Bookmark, Eraser, SquarePen, User, Volume2, X } from "lucide-react";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { useOnlineStatus } from "../hooks/use-online-status";
import { WordWithVerse } from "../types/prisma";
import { useRecitation } from "@/app/contexts/RecitationContext";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const NOTE_MAX_LENGTH = 500;

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | Verse;
  verseDisplayText?: string;
  currentColor?: string;
  // Name of the color mark's author, shown only when it wasn't made by the
  // current viewer (e.g. a teacher's mark on a student's mushaf). See ADR 0012.
  colorAuthorName?: string | null;
  currentNote?: string;
  // Name of the note's author — read independently from colorAuthorName, since
  // a shared mushaf can have a different author per mark_type (ADR 0022).
  noteAuthorName?: string | null;
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

type BookmarksTabProps = {
  markWord: (color: string) => void;
  currentColor?: string;
  authorName?: string | null;
  removeMark: () => void;
  error: boolean;
  isOffline: boolean;
};

const BookmarksTab = ({
  markWord,
  currentColor,
  authorName,
  removeMark,
  error,
  isOffline,
}: BookmarksTabProps) => {
  const t = useTranslations();
  const [selectedColor, setSelectedColor] = useState(currentColor);

  return (
    <>
      <MarkedByLine authorName={authorName} />
      <p className="text-xs font-medium text-muted-foreground mb-2.5">
        {t("markModal.chooseColorLabel", "Choose bookmark color")}
      </p>
      <MarkerColorPicker
        value={selectedColor}
        onChange={setSelectedColor}
        disabled={isOffline}
      />
      <button
        onClick={() => selectedColor && markWord(selectedColor)}
        disabled={!selectedColor || isOffline}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium bg-primary text-primary-foreground transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
      >
        <Bookmark className="w-4 h-4" strokeWidth={1.8} />
        {t("markModal.saveMark", "Save Bookmark")}
      </button>
      {currentColor ? (
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
    </>
  );
};

type NotesTabProps = {
  saveNote: (text: string) => void;
  currentNote?: string;
  authorName?: string | null;
  removeNote: () => void;
  error: boolean;
  isOffline: boolean;
};

const NotesTab = ({
  saveNote,
  currentNote,
  authorName,
  removeNote,
  error,
  isOffline,
}: NotesTabProps) => {
  const t = useTranslations();
  const [text, setText] = useState(currentNote ?? "");

  return (
    <>
      <MarkedByLine authorName={authorName} />
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, NOTE_MAX_LENGTH))}
        maxLength={NOTE_MAX_LENGTH}
        disabled={isOffline}
        placeholder={t("markModal.notePlaceholder", "Write a note…")}
        dir="auto"
        className="bg-card min-h-[96px] resize-none"
      />
      <p className="mt-1 text-end text-[10px] text-muted-foreground">
        {text.length}/{NOTE_MAX_LENGTH}
      </p>
      <button
        onClick={() => text.trim() && saveNote(text.trim())}
        disabled={!text.trim() || isOffline}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium bg-primary text-primary-foreground transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
      >
        <SquarePen className="w-4 h-4" strokeWidth={1.8} />
        {t("markModal.saveNote", "Save Note")}
      </button>
      {currentNote ? (
        <button
          onClick={removeNote}
          disabled={isOffline}
          className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Eraser className="w-4 h-4" strokeWidth={1.8} />
          {t("markModal.removeNote", "Remove Note")}
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
    </>
  );
};

const tabs = [
  {
    key: "bookmarks",
    labelKey: "markModal.bookmarksTab",
    defaultLabel: "Bookmarks",
    icon: () => <Bookmark className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    key: "notes",
    labelKey: "markModal.notesTab",
    defaultLabel: "Notes",
    icon: () => <SquarePen className="w-4 h-4" strokeWidth={1.8} />,
  },
];

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
  currentColor,
  colorAuthorName,
  currentNote,
  noteAuthorName,
  grantId,
}: ModalProps) {
  const { reload: reloadMarks } = useMarks(markFor.page_number, grantId);
  const t = useTranslations();
  const [errors, setErrors] = useState({ color: false, note: false });
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { openSettings } = useRecitation();

  const isWord = "location" in markFor;

  const playFromHere = () => {
    openSettings(markFor.verse_key);
    close();
  };

  const saveMark = async (markType: "color" | "note", value: string) => {
    setErrors((prev) => ({ ...prev, [markType]: false }));
    const added = await addPageMark(
      {
        marked_type: isWord ? "word" : "verse",
        marked_id: isWord ? markFor.location : markFor.verse_key,
        mark_type: markType,
        mark_value: value,
        page_number: markFor.page_number,
      },
      grantId,
    );

    if (added) {
      reloadMarks();
      close();
    } else {
      setErrors((prev) => ({ ...prev, [markType]: true }));
    }
  };

  const removeMarkType = async (markType: "color" | "note") => {
    setErrors((prev) => ({ ...prev, [markType]: false }));
    const removed = await deletePageMark(
      {
        marked_type: isWord ? "word" : "verse",
        marked_id: isWord ? markFor.location : markFor.verse_key,
        mark_type: markType,
        page_number: markFor.page_number,
      },
      grantId,
    );

    if (removed) {
      reloadMarks();
      close();
    } else {
      setErrors((prev) => ({ ...prev, [markType]: true }));
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
          <DialogTitle
            className="flex text-foreground text-xl font-medium leading-normal tracking-normal mt-1.5"
            style={{ fontFamily: "var(--uthmanic)" }}
            dir="rtl"
          >
            {getTitle(markFor, verseDisplayText)}
          </DialogTitle>
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
        <Tabs defaultValue="bookmarks">
          <TabsList className="mb-2 bg-muted p-1 h-auto w-full">
            {tabs.map(({ icon, key, labelKey, defaultLabel }) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "flex-1 gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                )}
              >
                {icon()}
                <span className="text-xs font-medium">
                  {t(labelKey, defaultLabel)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value="bookmarks"
            className="rounded-xl bg-muted border border-border/60 p-2.5"
          >
            <BookmarksTab
              markWord={(color) => saveMark("color", color)}
              currentColor={currentColor}
              authorName={colorAuthorName}
              removeMark={() => removeMarkType("color")}
              error={errors.color}
              isOffline={isOffline}
            />
          </TabsContent>
          <TabsContent
            value="notes"
            className="rounded-xl bg-muted border border-border/60 p-2.5"
          >
            <NotesTab
              saveNote={(text) => saveMark("note", text)}
              currentNote={currentNote}
              authorName={noteAuthorName}
              removeNote={() => removeMarkType("note")}
              error={errors.note}
              isOffline={isOffline}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
