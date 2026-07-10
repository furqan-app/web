import { jsonResponse } from "@/app/api/response";
import { qdcRecitationProvider } from "@/app/lib/recitation/qdc-provider";

export async function GET() {
  try {
    const data = await qdcRecitationProvider.getReciters();
    return jsonResponse({ data });
  } catch {
    return jsonResponse({ code: 502, message: "Failed to fetch reciters" });
  }
}
