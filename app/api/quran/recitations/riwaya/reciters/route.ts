import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import { RIWAYA_NARRATOR_MAP } from "@/app/constants/recitation";
import { quranhubRecitationProvider } from "@/app/lib/recitation/quranhub-provider";
import { Riwaya } from "@/app/types/recitation";

const VALID_RIWAYAT = Object.keys(RIWAYA_NARRATOR_MAP) as Riwaya[];

function isRiwaya(value: string | null): value is Riwaya {
  return value != null && (VALID_RIWAYAT as string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const riwaya = request.nextUrl.searchParams.get("riwaya");
  const language = request.nextUrl.searchParams.get("language") ?? "en";

  if (!isRiwaya(riwaya)) {
    return jsonResponse({ code: 422, message: "Invalid or missing riwaya" });
  }

  try {
    const data = await quranhubRecitationProvider.getRiwayaReciters(riwaya, language);
    return jsonResponse({ data });
  } catch {
    return jsonResponse({ code: 502, message: "Failed to fetch riwaya reciters" });
  }
}
