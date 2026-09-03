/**
 * Fetch+cache a byte response unless it is already cached, returning its stored
 * size. Shared by the offline recitation (ADR 0046) and offline tafsir (ADR
 * 0060) download loops — both need the exact "cache.match → blob size, else
 * fetch → put(clone) → blob size" sequence, and a `Response` body is single-use
 * so the `.clone()` ordering is load-bearing.
 */
export async function ensureCachedBytes(
  cache: Cache,
  url: string,
  opts?: {
    /** Override `fetch` (e.g. a retrying fetcher for a rate-limited API). */
    fetcher?: (url: string) => Promise<Response>;
    /** Match ignoring the stored response's `Vary` header. */
    ignoreVary?: boolean;
  },
): Promise<number> {
  const existing = await cache.match(url, { ignoreVary: opts?.ignoreVary ?? false });
  if (existing) return (await existing.blob()).size;

  const response = await (opts?.fetcher ?? fetch)(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  await cache.put(url, response.clone());
  return (await response.blob()).size;
}
