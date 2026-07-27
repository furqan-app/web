// Immutable FontFace registry for Quran page fonts (ADR 0029). A live
// stylesheet's text can never be rewritten once it contains @font-face rules the
// user can see — any mutation re-parses the whole sheet and resets every face in
// it to `unloaded`, blanking currently-visible text under `font-display: block`.
// `ensurePageFonts` is therefore the only way page fonts enter/leave
// `document.fonts`: a face, once created via `new FontFace` -> `add` -> `load`,
// is never touched again; eviction removes the whole face via `delete`, never a
// text rewrite. Shared by the mobile path (ReaderPager) and the desktop/tablet
// path (FontFaceInjector) so both draw from one LRU-capped set.
const MAX_KEPT = 24;

const registry = new Map<number, FontFace>();

export function ensurePageFonts(ids: number[]): void {
  for (const id of ids) {
    const existing = registry.get(id);
    if (existing) {
      // Re-insert to mark most-recently-used — Map iteration order is insertion
      // order, so this keeps the current window at the end (safe from eviction).
      registry.delete(id);
      registry.set(id, existing);
      continue;
    }
    const face = new FontFace(
      `quran-p${id}`,
      `url(/fonts/v1/woff2/p${id}.woff2)`,
      { display: "block" },
    );
    registry.set(id, face);
    document.fonts.add(face);
    face.load().catch(() => {});
  }

  while (registry.size > MAX_KEPT) {
    const oldestId = registry.keys().next().value;
    if (oldestId === undefined) break;
    const oldestFace = registry.get(oldestId);
    registry.delete(oldestId);
    if (oldestFace) document.fonts.delete(oldestFace);
  }
}
