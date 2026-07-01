import { Verse } from "@prisma/client";
import { Bookmark, SquarePen } from "lucide-react";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { WordWithVerse } from "../types/prisma";
import { addPageMark } from "../server/actions/addPageMark";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | Verse;
  verseDisplayText?: string;
};

const categories = [
  {
    key: "bookmarks",
    header: () => <Bookmark className="w-5 h-5" />,
    content: (markWord: (color: string) => void) => (
      <MarkerColorPicker onMark={markWord} />
    ),
  },
  {
    key: "notes",
    header: () => <SquarePen className="w-5 h-5" />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    content: (markWord: (color: string) => void) => (
      <p className="text-foreground">Under development.</p>
    ),
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
              <ul>{content(markWord)}</ul>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

