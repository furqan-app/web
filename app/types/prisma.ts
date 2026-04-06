import { Prisma } from "@prisma/client";

export type WordWithVerse = Prisma.WordGetPayload<{ include: { verse: { include: { chapter: true } } } }>;

export type RubWithVerses = Prisma.RubGetPayload<{
  include: {
    rubVerseMappings: true;
    startVerse: { select: { text_uthmani: true; page_number: true } };
    endVerse: { select: { text_uthmani: true; page_number: true } };
  };
}>;
