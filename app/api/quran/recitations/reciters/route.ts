import { jsonResponse } from "@/app/api/response";
import { QDC_BASE_URL } from "@/app/constants/recitation";
import { Reciter } from "@/app/types/recitation";

type QdcReciter = {
  id: number;
  name: string;
  translated_name?: { name: string; language_name: string } | null;
  style?: { name: string; language_name: string; description: string } | null;
};

export async function GET() {
  const res = await fetch(`${QDC_BASE_URL}/audio/reciters`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return jsonResponse({ code: 502, message: "Failed to fetch reciters" });
  }

  const { reciters } = (await res.json()) as { reciters: QdcReciter[] };

  const data: Reciter[] = reciters.map((r) => ({
    id: r.id,
    name: r.name,
    translatedName: r.translated_name?.name ?? r.name,
    style: r.style?.name ?? null,
  }));

  return jsonResponse({ data });
}
