import { ReactNode } from "react";
import { Verse } from "@/app/generated/quran-client";
import { Bookmark, Eraser, SquarePen } from "lucide-react";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { WordWithVerse } from "../types/prisma";
import { addPageMark } from "../server/actions/addPageMark";
import { deletePageMark } from "../server/actions/deletePageMark";
import useTranslations from "../hooks/use-translations";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | Verse;
  verseDisplayText?: string;
  currentColor?: string;
};

type CategoryContentProps = {
  markWord: (color: string) => void;
  currentColor?: string;
  removeMark: () => void;
};

const BookmarksTab = ({
  markWord,
  currentColor,
  removeMark,
}: CategoryContentProps) => {
  const t = useTranslations();

  return (
    <>
      <MarkerColorPicker onMark={markWord} />
      {currentColor ? (
        <button
          onClick={removeMark}
          className="mt-4 pt-3 w-full flex items-center justify-center gap-2 border-t border-border rounded-lg py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Eraser className="w-4 h-4" strokeWidth={1.8} />
          {t("markModal.removeMark", "Remove Mark")}
        </button>
      ) : null}
    </>
  );
};

const categories: Array<{
  key: string;
  header: () => ReactNode;
  content: (props: CategoryContentProps) => ReactNode;
}> = [
  {
    key: "bookmarks",
    header: () => <Bookmark className="w-5 h-5" />,
    content: (props) => <BookmarksTab {...props} />,
  },
  {
    key: "notes",
    header: () => <SquarePen className="w-5 h-5" />,
    content: () => <p className="text-foreground">Under development.</p>,
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
}: ModalProps) {
  const { reload: reloadMarks } = useMarks(markFor.page_number);

  const isWord = "location" in markFor;

  const markWord = async (color: string) => {
    const added = await addPageMark({
      marked_type: isWord ? "word" : "verse",
      marked_id: isWord ? markFor.location : markFor.verse_key,
      mark_type: "color",
      mark_value: color,
      page_number: markFor.page_number,
    });

    if (added) {
      reloadMarks();
      close();
    }
  };

  const removeMark = async () => {
    const removed = await deletePageMark({
      marked_type: isWord ? "word" : "verse",
      marked_id: isWord ? markFor.location : markFor.verse_key,
      mark_type: "color",
      page_number: markFor.page_number,
    });

    if (removed) {
      reloadMarks();
      close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-full max-w-md bg-card">
        <h3
          className="flex text-foreground text-2xl font-medium mb-4"
          style={{ fontFamily: "var(--uthmanic)" }}
          dir="rtl"
        >
          {getTitle(markFor, verseDisplayText)}
        </h3>
        <Tabs defaultValue="bookmarks">
          <TabsList className="mb-3">
            {categories.map(({ header, key }) => (
              <TabsTrigger key={key} value={key}>
                {header()}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map(({ key, content }) => (
            <TabsContent
              key={key}
              value={key}
              className="rounded-xl bg-muted p-3"
            >
              <ul>{content({ markWord, currentColor, removeMark })}</ul>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

