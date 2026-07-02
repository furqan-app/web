import { PrismaClient as QuranPrismaClient } from "@/app/generated/quran-client";
import { PrismaClient as AppPrismaClient } from "@/app/generated/app-client";
import mysql from "mysql2";

const withConnectionLimit = (url: string): string => {
  const dbUrl = new URL(url);
  dbUrl.searchParams.set("connection_limit", "5");
  return dbUrl.toString();
};

const quranDatabaseUrl = new URL(process.env.QURAN_DATABASE_URL!);

export const connection = mysql
  .createConnection({
    host: quranDatabaseUrl.hostname,
    user: quranDatabaseUrl.username,
    password: quranDatabaseUrl.password,
    database: quranDatabaseUrl.pathname.slice(1), // Remove leading "/"
    port: parseInt(quranDatabaseUrl.port) || 3306,
  })
  .promise();

export const quranPrisma = new QuranPrismaClient({
  datasources: { db: { url: withConnectionLimit(process.env.QURAN_DATABASE_URL!) } },
});

export const appPrisma = new AppPrismaClient({
  datasources: { db: { url: withConnectionLimit(process.env.APP_DATABASE_URL!) } },
});
