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
      verses.verse_key,
      verses.text_imlaei_simple,
      verses.text_uthmani,
      verses.page_number
    FROM verses 
    WHERE verses.text_imlaei_simple LIKE ?
    `,
    [`%${query}%`]
  );

  return NextResponse.json({ results });
}