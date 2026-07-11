import { jsonResponse } from "@/app/api/response";
import { qdcRecitationProvider } from "@/app/lib/recitation/qdc-provider";

export async function GET(
  _request: Request,
  { params }: { params: { reciterId: string; chapterId: string } },
) {
  const reciterId = Number(params.reciterId);
  const chapterId = Number(params.chapterId);

  if (!Number.isInteger(reciterId) || !Number.isInteger(chapterId)) {
    return jsonResponse({ code: 422, message: "Invalid reciter or chapter id" });
  }

  try {
    const data = await qdcRecitationProvider.getChapterAudio(reciterId, chapterId);
    if (!data) {
      return jsonResponse({ code: 404, message: "No audio found for this reciter/chapter" });
    }
    return jsonResponse({ data });
  } catch {
    return jsonResponse({ code: 502, message: "Failed to fetch chapter audio" });
  }
}
