import {
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { Verse } from "@prisma/client";
import { BookmarkIcon, PencilSquareIcon } from "@heroicons/react/16/solid";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { useRouter } from "next/navigation";
import { FQModal } from "./ui/FQModal";
import { WordWithVerse } from "../types/prisma";

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | Verse;
};

const categories = [
  {
    key: "bookmarks",
    header: () => <BookmarkIcon className="w-6 h-6" />,
    content: (markWord: (color: string) => void) => (
      <MarkerColorPicker onMark={markWord} />
    ),
  },
  {
    key: "notes",
    header: () => <PencilSquareIcon className="w-6 h-6" />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    content: (markWord: (color: string) => void) => (
      <p className="text-dark dark:text-white">Under development.</p>
    ),
  },
];

export function MarkModal({ isOpen, close, markFor }: ModalProps) {
  const { reload: reloadMarks } = useMarks(markFor.page_number);
  const router = useRouter();

  const isWord = "location" in markFor;

  const markWord = async (color: string) => {
    const body = JSON.stringify({
      marked_type: isWord ? "word" : "verse",
      marked_id: isWord ? markFor.location : markFor.verse_key,
      mark_type: "color",
      mark_value: color,
    });

    try {
      const response = await fetch(
        `http://localhost:3000/api/quran/pages/${markFor.page_number}/marks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body,
        }
      ).then((res) => res.json());

      console.log(response);

      if (response.code === 401) {
        return router.push("/api/auth/signin");
      }

      if (response.success) {
        reloadMarks();
        close();
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <FQModal isOpen={isOpen} close={close}>
      {({ close }) => (
        <FQModal.Body close={close}>
          <DialogTitle
            as="h3"
            className="flex flex-row-reverse text-black dark:text-white text-2xl font-medium mb-4"
            style={{
              fontFamily: `var(--uthmanic)`,
            }}
          >
            {markFor.text_uthmani.length > 70
              ? "..." + markFor.text_uthmani.slice(0, 70)
              : markFor.text_uthmani}
          </DialogTitle>
          <TabGroup>
            <TabList className="flex gap-4 text-black dark:text-white">
              {categories.map(({ header, key }) => (
                <Tab
                  key={key}
                  className="rounded-full py-1 px-3 text-sm/6 font-semibold focus:outline-none data-[selected]:bg-gray-200 dark:data-[selected]:bg-white/10 data-[hover]:bg-gray-200 dark:data-[hover]:bg-white/5 data-[selected]:data-[hover]:bg-white/10 data-[focus]:outline-1 data-[focus]:outline-black dark:data-[focus]:outline-white"
                >
                  {header()}
                </Tab>
              ))}
            </TabList>
            <TabPanels className="mt-3">
              {categories.map(({ key, content }) => (
                <TabPanel key={key} className="rounded-xl  bg-gray-200 dark:bg-white/5 p-3">
                  <ul>{content(markWord)}</ul>
                </TabPanel>
              ))}
            </TabPanels>
          </TabGroup>
        </FQModal.Body>
      )}
    </FQModal>
  );
}

