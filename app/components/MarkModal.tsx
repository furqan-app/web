import { ReactNode, useState } from "react";
import { Verse } from "@/app/generated/quran-client";
import { Bookmark, Eraser, SquarePen, User, X } from "lucide-react";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { useOnlineStatus } from "../hooks/use-online-status";
import { WordWithVerse } from "../types/prisma";
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
import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | Verse;
  verseDisplayText?: string;
  currentColor?: string;
  // Name of the mark's author, shown only when it wasn't made by the current
  // viewer (e.g. a teacher's mark on a student's mushaf). See ADR 0012.
  markedByName?: string | null;
  // When set, add/remove operate on the granted mushaf instead of the viewer's.
  grantId?: string;
};

type CategoryContentProps = {
  markWord: (color: string) => void;
  currentColor?: string;
  removeMark: () => void;
  error: boolean;
  isOffline: boolean;
};

const BookmarksTab = ({
  markWord,
  currentColor,
  removeMark,
  error,
  isOffline,
}: CategoryContentProps) => {
  const t = useTranslations();
  const [selectedColor, setSelectedColor] = useState(currentColor);

  return (
    <>
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

const NotesTab = () => {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <SquarePen className="w-5 h-5 text-muted-foreground" strokeWidth={1.6} />
      <p className="text-sm text-muted-foreground">
        {t("markModal.notesComingSoon", "Coming soon")}
      </p>
    </div>
  );
};

const categories: Array<{
  key: string;
  labelKey: string;
  defaultLabel: string;
  header: () => ReactNode;
  content: (props: CategoryContentProps) => ReactNode;
}> = [
  {
    key: "bookmarks",
    labelKey: "markModal.bookmarksTab",
    defaultLabel: "Bookmarks",
    header: () => <Bookmark className="w-4 h-4" strokeWidth={1.8} />,
    content: (props) => <BookmarksTab {...props} />,
  },
  {
    key: "notes",
    labelKey: "markModal.notesTab",
    defaultLabel: "Notes",
    header: () => <SquarePen className="w-4 h-4" strokeWidth={1.8} />,
    content: () => <NotesTab />,
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
  markedByName,
  grantId,
}: ModalProps) {
  const { reload: reloadMarks } = useMarks(markFor.page_number, grantId);
  const t = useTranslations();
  const [error, setError] = useState(false);
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;

  const isWord = "location" in markFor;

  const markWord = async (color: string) => {
    setError(false);
    const added = await addPageMark(
      {
        marked_type: isWord ? "word" : "verse",
        marked_id: isWord ? markFor.location : markFor.verse_key,
        mark_type: "color",
        mark_value: color,
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
        mark_type: "color",
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
          {markedByName ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3" strokeWidth={1.8} />
              <span>
                {t("markModal.markedBy", "Marked by")} {markedByName}
              </span>
            </p>
          ) : null}
        </div>
        <Tabs defaultValue="bookmarks">
          <TabsList className="mb-2 bg-muted p-1 h-auto w-full">
            {categories.map(({ header, key, labelKey, defaultLabel }) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "flex-1 gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                )}
              >
                {header()}
                <span className="text-xs font-medium">
                  {t(labelKey, defaultLabel)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map(({ key, content }) => (
            <TabsContent
              key={key}
              value={key}
              className="rounded-xl bg-muted border border-border/60 p-2.5"
            >
              {content({ markWord, currentColor, removeMark, error, isOffline })}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
