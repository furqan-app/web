import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { qdcRecitationProvider } from "@/app/lib/recitation/qdc-provider";

export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get("language") ?? "en";

  try {
    const data = await qdcRecitationProvider.getReciters(language);
    return jsonResponse({ data });
  } catch {
    return jsonResponse({ code: 502, message: "Failed to fetch reciters" });
  }
}
