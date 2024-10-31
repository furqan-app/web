import { NextResponse } from "next/server";
import { connection } from "../../../../utils/db";
import { groupBy } from "../../../../utils/groupBy";
import { Word } from "../../../../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: Request, context: any) {
  const { pageId } = context.params;
  const words = await connection.execute(
    `select * from words where words.page_number = ${pageId} order by words.verse_id, words.position`
  );

  return NextResponse.json(groupBy(words[0] as Array<Word>, "line_number"));
}

