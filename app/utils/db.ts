import { PrismaClient as QuranPrismaClient } from "@/app/generated/quran-client";
import { PrismaClient as AppPrismaClient } from "@/app/generated/app-client";

const globalForPrisma = global as unknown as {
  quranPrisma: QuranPrismaClient;
  appPrisma: AppPrismaClient;
};

export const quranPrisma = globalForPrisma.quranPrisma || new QuranPrismaClient();
export const appPrisma = globalForPrisma.appPrisma || new AppPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.quranPrisma = quranPrisma;
  globalForPrisma.appPrisma = appPrisma;
}
