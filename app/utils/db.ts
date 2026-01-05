import { PrismaClient } from "@prisma/client";
import mysql from "mysql2";

export const connection = mysql
  .createConnection({
    host: "localhost",
    user: "quran_user",
    password: "quran_password",
    database: "quran_db",
    port: 3307,
  })
  .promise();

export const prisma = new PrismaClient();
