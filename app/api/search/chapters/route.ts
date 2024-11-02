import { NextResponse } from "next/server";
import { connection } from "../../../utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const [results] = await connection.execute(
    `SELECT 
      id,
      name_arabic,
      name_simple,
      verses_count,
      pages
    FROM chapters
    WHERE name_arabic LIKE ? OR name_simple LIKE ?
    ORDER BY id
    LIMIT 10`,
    [`%${query}%`, `%${query}%`]
  );

  return NextResponse.json({ results });
}