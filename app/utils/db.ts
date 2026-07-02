import { PrismaClient as QuranPrismaClient } from "@/app/generated/quran-client";
import { PrismaClient as AppPrismaClient } from "@/app/generated/app-client";

export const quranPrisma = new QuranPrismaClient();
export const appPrisma = new AppPrismaClient();
