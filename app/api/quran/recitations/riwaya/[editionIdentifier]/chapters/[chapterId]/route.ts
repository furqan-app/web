import { jsonResponse } from "@/app/api/response";
import { quranhubRecitationProvider } from "@/app/lib/recitation/quranhub-provider";

export async function GET(
  _request: Request,
  { params }: { params: { editionIdentifier: string; chapterId: string } },
) {
  const chapterId = Number(params.chapterId);
  const editionIdentifier = params.editionIdentifier;

  if (!editionIdentifier || !Number.isInteger(chapterId)) {
    return jsonResponse({ code: 422, message: "Invalid edition identifier or chapter id" });
  }

  try {
    const data = await quranhubRecitationProvider.getChapterVerseAudio(
      editionIdentifier,
      chapterId,
    );
    return jsonResponse({ data });
  } catch {
    return jsonResponse({ code: 502, message: "Failed to fetch riwaya chapter audio" });
  }
}
