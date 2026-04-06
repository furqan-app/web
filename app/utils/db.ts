import { PrismaClient } from "@prisma/client";
import mysql from "mysql2";

const databaseUrl = new URL(process.env.DATABASE_URL!);

export const connection = mysql
  .createConnection({
    host: databaseUrl.hostname,
    user: databaseUrl.username,
    password: databaseUrl.password,
    database: databaseUrl.pathname.slice(1), // Remove leading "/"
    port: parseInt(databaseUrl.port) || 3306,
  })
  .promise();

export const prisma = new PrismaClient();
