/**
 * Parses a raw route segment to a positive integer, rejecting a leading zero so
 * `/007/1` doesn't render a duplicate of `/7/1`. Returns null on anything else.
 */
export function parseSegment(raw: string): number | null {
  if (!/^[1-9]\d{0,2}$/.test(raw)) return null;
  return Number(raw);
}
