import type { MushafEdition } from "@/app/utils/mushaf-editions";

// Immutable FontFace registry for Quran page fonts (ADR 0029). A live
// stylesheet's text can never be rewritten once it contains @font-face rules the
// user can see — any mutation re-parses the whole sheet and resets every face in
// it to `unloaded`, blanking currently-visible text under `font-display: block`.
// `ensurePageFonts` is therefore the only way page fonts enter/leave
// `document.fonts`: a face, once created via `new FontFace` -> `add` -> `load`,
// is never touched again; eviction removes the whole face via `delete`, never a
// text rewrite. Shared by the mobile path (ReaderPager) and the desktop/tablet
// path (FontFaceInjector) so both draw from one LRU-capped set.
//
// Keyed by edition AND page: a page number alone is not unique across mushaf
// editions, since each edition ships its own font file per page (ADR 0033).
// Colour-glyph editions do not come through here at all — they need CSS
// `@font-palette-values`, which has no FontFace-API equivalent, so
// FontFaceInjector renders them as keyed `<style>` elements instead.
const MAX_KEPT = 24;

const registry = new Map<string, FontFace>();

const keyOf = (mushafId: number, page: number) => `${mushafId}:${page}`;

export function ensurePageFonts(ids: number[], edition: MushafEdition): void {
  for (const id of ids) {
    const key = keyOf(edition.id, id);
    const existing = registry.get(key);
    if (existing) {
      // Re-insert to mark most-recently-used — Map iteration order is insertion
      // order, so this keeps the current window at the end (safe from eviction).
      registry.delete(key);
      registry.set(key, existing);
      continue;
    }
    const face = new FontFace(
      edition.fontFamily(id),
      `url(${edition.fontUrl(id)})`,
      { display: "block" },
    );
    registry.set(key, face);
    document.fonts.add(face);
    face.load().catch(() => {});
  }

  while (registry.size > MAX_KEPT) {
    const oldestKey = registry.keys().next().value;
    if (oldestKey === undefined) break;
    const oldestFace = registry.get(oldestKey);
    registry.delete(oldestKey);
    if (oldestFace) document.fonts.delete(oldestFace);
  }
}

// Settles once every ALREADY-REGISTERED face for `ids` has finished downloading.
// Read-only on purpose: it registers nothing, so it never becomes a second place
// fonts enter the registry. The pager's Stage B lookahead waits on it before
// warming the page after the visible window — on a saturated link, firing both
// at once makes the nearer page arrive later, not sooner (ADR 0034). Ids with no
// registered face settle immediately, and a face that fails to load resolves
// rather than rejects, so one dead font can never stall lookahead for the rest
// of the session.
export function pageFontsReady(ids: number[], edition: MushafEdition): Promise<void> {
  return Promise.all(
    ids.map((id) => registry.get(keyOf(edition.id, id))?.loaded.catch(() => {})),
  ).then(() => undefined);
}
