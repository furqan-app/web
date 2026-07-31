import { VerticalQuranPages } from "@/app/components/VerticalQuranPages";

// Bounds Hostinger CDN edge-cache poisoning to a 5-minute window instead of
// Next's default 1-year s-maxage (see ADR 0035).
export const revalidate = 300;

export default async function VerticalReading() {
  return <VerticalQuranPages />;
}

