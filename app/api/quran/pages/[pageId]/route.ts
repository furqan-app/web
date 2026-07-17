import { NextResponse } from "next/server";
import { getPageWords } from "@/app/hooks/get-page-words";

// Reuses getPageWords (rather than re-querying independently, as this route
// previously did) so the word layouts map can never drift from the
// build-time reader's — see ADR 0023 Addendum 6.
export async function GET(
  request: Request,
  context: { params: { pageId: string } }
) {
  const pageNumber = Number(context.params.pageId);
  return NextResponse.json(await getPageWords(pageNumber));
}
