import { Prisma } from "@prisma/client";

export type WordWithVerse = Prisma.WordGetPayload<{ include: { verse: { include: { chapter: true } } } }>;
