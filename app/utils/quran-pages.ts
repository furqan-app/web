// Pages pair up in fixed pairs (1,2), (3,4)...(603,604) — no singleton pages.
// See ADR 0013.
export function getPagePair(page: number): { rightPage: number; leftPage: number } {
  const pairIndex = Math.ceil(page / 2);
  return { rightPage: pairIndex * 2 - 1, leftPage: pairIndex * 2 };
}
