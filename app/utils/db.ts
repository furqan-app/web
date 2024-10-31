import mysql from "mysql2";

export const connection = mysql
  .createConnection({
    host: "localhost",
    user: "quran_user",
    password: "quran_password",
    database: "quran_db",
  })
  .promise();
