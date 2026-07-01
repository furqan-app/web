import { Prisma } from "@prisma/client";

export type WordWithVerse = Prisma.WordGetPayload<{ include: { verse: { include: { chapter: true } } } }>;

export type PageMetadataWithChapter = Prisma.PageMetadataGetPayload<{
  include: { chapter: true };
}>;

export type RubWithVerses = Prisma.RubGetPayload<{
  include: {
    rubVerseMappings: true;
    startVerse: {
      select: {
        page_number: true;
        Word: { select: { qpc_uthmani_hafs: true; char_type_name: true } };
      };
    };
    endVerse: { select: { page_number: true } };
  };
}>;
