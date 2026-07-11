# Verse/Word Comments

**Type:** feature
**Date:** 2026-07-11
**Status:** implemented
**Trello:** [#44 Verse/Word comments](https://trello.com/c/mLiLSjMw/44-verse-word-comments)

## Summary

Users can already color-mark a word or verse. This adds a second, independent kind of mark — a free-text **comment** — on the same word/verse, using the `Mark` model's already-documented (but unimplemented) `mark_type: "note"`. A word/verse carrying a comment gets a `border-b-2 border-dotted border-primary` indicator in the reader; there is no hover tooltip. Reading/writing the comment happens in `MarkModal`'s existing "Notes" tab, which today just shows a "Coming soon" placeholder. The My Marks page gets a 4th tab listing comments alongside the existing 3 color tabs.

See [ADR 0022](../architecture/adr/0022-verse-word-comments-as-mark-type.md) for why this reuses `Mark` instead of a new model, and the "Verse/Word Comments" entry in `DECISIONS.md` for the resulting constraints.

## Approach

Comments are **not** a new feature surface — they're a second `mark_type` flowing through the exact same generic read/write/access-grant path color marks already use (`upsertMark`, `deleteMark`, the marks API routes, `useMarks`/`getPageMarks`). The only backend change is widening `Mark.mark_value` to `@db.Text` (currently `VARCHAR(191)`, sized for 3-letter color names) via a Prisma migration. Everything else is UI: a real Notes tab in `MarkModal`, a note-indicator check in `QuranWord`, and a 4th tab in `MyMarksList`.

## Decision Tree / Algorithm

**Which mark_type values can coexist on one word/verse:**

| Scenario | color mark row | note mark row | Reader rendering |
|---|---|---|---|
| No marks | — | — | plain word, no bg, no border |
| Color only | exists | — | bg highlight, no border |
| Note only | — | exists | no bg, dotted border-b under the word (or every word in the verse, if verse-level) |
| Both | exists | exists | bg highlight **and** dotted border-b together |

**Word-level vs verse-level note (mirrors existing color-mark mechanism, no new branch):**

| Trigger | `marked_type` | `marked_id` | Spread in `QuranLine` |
|---|---|---|---|
| Click a word (`char_type_name === "word"`) | `"word"` | `word.location` | Only that word's `QuranWord` sees the mark |
| Click end-of-verse marker (`char_type_name === "end"`) | `"verse"` | `word.verse_key` | `marks[word.verse_key]` is already spread onto every word in the verse in `QuranLine` — the note "name" check picks this up automatically, same as `"color"` does today |

**Attribution (per mark_type, not per word/verse):**

| Tab | Author shown | Why |
|---|---|---|
| Bookmarks | `getColorMarkMeta(marks).authorName`, shown only if `!isOwn` | Unchanged from today |
| Notes | `getNoteMarkMeta(marks).authorName`, shown only if `!isOwn` | New — independent because a shared mushaf can have a different author per `mark_type` on the same spot (ADR 0022) |

**My Marks page bucketing:**

| Tab | Filter | Item content |
|---|---|---|
| Red / Blue / Green | `mark_type === "color" && mark_value === <color key>` | Unchanged: color chip, bookmark icon, snippet, delete |
| Notes (new) | `mark_type === "note"` | Pencil icon (not color chip), snippet, **truncated comment preview**, delete (calls `deletePageMark` with `mark_type: "note"`) |

A word/verse with both a color and a note appears once in its color tab and once in the Notes tab — two independent `Mark` rows, not a merged entry.

## Verified Test Cases

1. **Plain word, no marks** — no bg, no border. Clicking opens `MarkModal`; Bookmarks tab has no color selected, Notes tab textarea is empty, neither shows a "Marked by" line.
2. **Word marked red only** — red bg, no border-bottom. Bookmarks tab shows red selected (+ author if not own); Notes tab is empty with no author line.
3. **Word marked red AND has a note** — red bg **and** dotted border-bottom both render on the same word simultaneously (independent CSS, no conflict: bg vs border). Bookmarks tab shows red + its author; Notes tab shows the comment text + its own (possibly different) author.
4. **Verse-level note only, no color** (added by clicking the end-of-verse marker) — every word in that verse gets the dotted border-bottom via the existing `marks[verse_key]` spread in `QuranLine`; no background color anywhere in the verse.
5. **Removing a note** (Remove button in Notes tab) — border-bottom disappears from the word/verse; any existing color mark on the same spot is untouched (independent `Mark` row, independent delete call with `mark_type: "note"`).
6. **My Marks page, a word with color=red and note="test"** — appears under the Red tab (unchanged) and also appears as a separate row under the new Notes tab, since these are two different `Mark` rows sharing the same `marked_id`.
7. **Shared mushaf (grant): viewer adds a note to a word the owner already color-marked** — Bookmarks tab shows "Marked by [owner]" (unchanged); Notes tab shows no "Marked by" line for the viewer's own note (`is_own: true`) — the two tabs' attribution are read independently, not from one shared `markedByName`.
8. **Comment length** — textarea enforces `maxLength={500}` with a character counter; DB column is `@db.Text` so nothing is silently truncated server-side even if the cap is bypassed via a direct API call (defense in depth is out of scope here — same trust level as the existing color-mark POST).

## Files to Change

- `prisma/app/schema.prisma` — `Mark.mark_value` becomes `String @db.Text` (was default `VARCHAR(191)` `String`). Run `npm run app-migrate-dev` (or equivalent) to generate the migration.
- `app/utils/marks.ts` — add `getNoteMark`/`getNoteMarkMeta`, mirroring `getColorMark`/`getColorMarkMeta` (`marks.find(action => action.name === "note")`).
- `app/components/QuranWord.tsx` — compute a `hasNote` boolean via `getNoteMark(marks)`; append `border-b-2 border-dotted border-primary` to the word's className when true, alongside (not replacing) the existing highlight class.
- `app/components/MarkModal.tsx`:
  - Replace the `NotesTab` "Coming soon" placeholder with a real implementation: textarea (shadcn `Textarea` — needs `npx shadcn@latest add textarea`, none exists yet), `maxLength={500}` + character counter, Save button (calls `addPageMark` with `mark_type: "note"`), Remove button (shown only when a note currently exists, calls `deletePageMark` with `mark_type: "note"`), offline-disabled state and error state mirroring `BookmarksTab`.
  - Prefill the textarea from a new `currentNote`/`noteAuthorName` prop pair (parallel to `currentColor`/existing `markedByName`).
  - Move "Marked by X" out of the shared modal header into each tab's own content — `BookmarksTab` shows the color mark's author, `NotesTab` shows the note's author, each independently gated on its own `!isOwn`.
- `app/components/QuranSafha.tsx` — alongside the existing `getCurrentColorMeta`, add a `getCurrentNoteMeta` using `getNoteMarkMeta`; pass both down to `MarkModal` (new `currentNote`/`noteAuthorName` props replacing the single `markedByName` prop, which moves per-tab as above).
- `app/api/marks/route.ts` — drop the `where: { mark_type: "color" }` filter (fetch `"color"` and `"note"` together); generalize `MarkListItem` so the shared field carries either a color key or comment text, discriminated by a `mark_type` field on each item (word/verse lookup logic for snippet/chapter/verse stays the same, since it's keyed off `marked_type`/`marked_id`, not `mark_type`).
- `app/server/actions/getAllMarks.ts` — re-exports `MarkListItem`; no logic change needed beyond the type update flowing through.
- `app/components/marks/MyMarksList.tsx` — add a 4th tab ("Notes") alongside the 3 `MARK_COLORS` tabs; bucket notes by `mark_type === "note"` instead of by color key; render a pencil icon + truncated comment preview instead of the color chip/bookmark icon; delete button passes `mark_type: "note"`.
- `app/constants/marks.ts` — no change to `MARK_COLORS`; may add a note-tab label constant here if useful for i18n key consistency.
- `messages/ar.json` / `messages/en.json` — new translation keys for: Notes tab textarea placeholder, save/remove button labels (`NotesTab` already has `markModal.notesTab`/`markModal.notesComingSoon` keys to replace), My Marks Notes tab label, empty-state copy.
- `docs/architecture/COMPONENTS.md` — per CLAUDE.md's "update after adding/removing/reorganising components" rule:
  - Add `Textarea` to the `components/ui/` primitives line (Zone: shared / UI primitives).
  - Update the `MarkModal` line (Zone: reader) — currently documents a single `"Marked by {name}"` behavior; must reflect that attribution is now shown per-tab (Bookmarks vs Notes), independently.
  - Update the `MyMarksList` line (Zone: marks) — currently says "fetches all of the caller's **color** marks... groups into red/blue/green sections"; must note the 4th Notes tab and that it now fetches both `mark_type`s.

## Files to Check (read, not modify)

- `docs/architecture/COMPONENTS.md` — read before touching `MarkModal`/`MyMarksList`/`QuranWord` to confirm no other caller assumes single-attribution or color-only marks beyond what's listed above (per CLAUDE.md's "check this file to understand all callers" rule).

## Constraints

- Do not create a new Prisma model for comments — reuse `Mark` with `mark_type: "note"` (ADR 0022).
- Do not add a hover tooltip anywhere — the border-bottom is the only passive indicator; reading the comment always goes through `MarkModal`.
- Do not merge color and note attribution into one `markedByName` — they must be read and displayed independently per tab, since a shared mushaf can have different authors per `mark_type` on the same word/verse.
- Do not special-case verse-level notes with new spread logic — reuse the existing `marks[verse_key]` → every word in `QuranLine` mechanism that color marks already rely on.
- Do not change the generic write/delete/read path (`upsertMark`, `deleteMark`, the marks API routes, `useMarks`/`getPageMarks`) — they are already parameterized over `mark_type` and require zero changes.

## What NOT to Do

- None known — this is a net-new feature with no prior superseded approach.

## Addendum 1 — RTL rendering fixes + comment box styling

**Date:** 2026-07-11

**Root cause:** Every other RTL-sensitive element in this codebase sets `dir` explicitly rather than relying on inherited direction from `<html dir>` (e.g. `MyMarksList.tsx`'s chapter header line already does `dir={locale === "ar" ? "rtl" : "ltr"}`; `MarkerColorPicker`, `SettingsSidebar` do the same; Quran text uses `dir="rtl"` unconditionally). The two elements added by this feature — the Notes tab `<Textarea>` in `MarkModal.tsx` and the comment-preview `<div>` in `MyMarksList.tsx` — never got a `dir` attribute, so they render LTR regardless of locale or content, confirmed by the user's screenshots.

**Decision:** Unlike the rest of the codebase (which locks `dir` to the active UI locale), comment text gets `dir="auto"` — the browser auto-detects direction from the first strong-directional character in the actual comment, correct even when an `ar`-locale user writes a note in English or vice versa. This is a deliberate one-off deviation from the locale-locked convention, chosen because comment text is free-form user content, not UI chrome or Quran text.

**Files to Change:**
- `app/components/MarkModal.tsx` — add `dir="auto"` to the `<Textarea>` in `NotesTab`.
- `app/components/marks/MyMarksList.tsx`:
  - Add `dir="auto"` to the comment-preview line.
  - Restyle the comment-preview line into a boxed treatment to distinguish it from the plain verse snippet above: `rounded-md bg-muted/50 border border-border/60 px-2 py-1 flex items-center gap-1`, with a small `SquarePen` icon (`size-3 text-muted-foreground`) prefixed inside the box before the comment text.

**Constraints:**
- `dir="auto"` is scoped to these two comment-text elements only — do not apply it elsewhere; every other element in the codebase keeps the existing locale-locked or Quran-text-locked `dir` convention.
- Do not change the box treatment's read/write logic — this is styling-only on top of the already-implemented Notes tab and My Marks Notes tab list item.

**What NOT to Do (addendum-specific):**
- Do not rely on inherited `direction` from `<html dir>` for any new form control (`input`/`textarea`/`select`) added in future work — this codebase's real-world experience (this bug) confirms form controls need an explicit `dir`, unlike plain block elements.

## Addendum 2 — note box packing order still wrong after Addendum 1

**Date:** 2026-07-11

**Root cause:** `dir="auto"` on the comment `<span>` (Addendum 1) fixes the bidi run direction of the text's own characters, but not which side of the icon it packs against — that's controlled by the flex container's own resolved direction, and the note box `<div className="mt-1 flex items-center gap-1 ...">` (MyMarksList.tsx) had no `dir` set. Its packing order was therefore following an ambient direction that isn't `rtl`, so the icon+text order still read wrong for the `ar` locale even though the Arabic glyphs themselves rendered correctly shaped.

**Decision:** Add `dir={locale === "ar" ? "rtl" : "ltr"}` to the note box container itself (locale-driven, matching the rest of this codebase's layout-direction convention) — this fixes icon/text packing order. Keep `dir="auto"` on the inner text `<span>` unchanged (still correct for bidi-detecting the actual comment content, e.g. an English note typed in the `ar` locale). The two `dir`s serve different purposes on the same element tree: the container's locale-driven `dir` controls layout/packing order; the span's content-driven `dir="auto"` controls text run direction.

**Files to Change:**
- `app/components/marks/MyMarksList.tsx` — add `dir={locale === "ar" ? "rtl" : "ltr"}` to the note box container div (~line 238); bump its padding from `px-2 py-1` to `px-2.5 py-1.5`.

**Constraints:**
- Do not remove the `dir="auto"` on the inner span — both `dir`s are needed, on different elements, for different reasons (see Decision above).

## Addendum 3 — note box container should also be content-based, not locale-based

**Date:** 2026-07-11

**Supersedes:** Addendum 2's "locale-driven container `dir`" decision. Per user request: the whole note box (icon packing order + text) should follow the comment's own detected language, exactly like the Notes tab `Textarea`, rather than being locked to the UI locale. A locale-locked container `dir` was inconsistent — an English comment written in the `ar` locale would still pack the box in RTL order even though the text itself reads LTR.

**Decision:** Change the note box container's `dir` from `{locale === "ar" ? "rtl" : "ltr"}` to `"auto"`. The `locale` variable is no longer needed for this element (still used elsewhere in the file). The inner `<span dir="auto">` is unchanged (redundant with the now-auto container, but harmless).

**Files to Change:**
- `app/components/marks/MyMarksList.tsx` — note box container `dir` → `"auto"`.

**What NOT to Do (addendum-specific):**
- Do not reintroduce a locale-based `dir` on any comment-text-related element (Notes tab `Textarea`, note box container, note preview span) — all three are now consistently content-based (`dir="auto"`), not locale-based, per this and the prior addenda.

## Addendum 4 — actual root cause: nested dir="auto" excludes the descendant from detection

**Date:** 2026-07-11

**Supersedes:** the "redundant with the now-auto container, but harmless" claim in Addendum 3's Decision — it was not harmless, it was the actual bug. Verified live via `getComputedStyle` in the browser (with permission).

**Root cause:** Per the HTML living standard, an element's `dir="auto"` auto-detection algorithm scans its flattened descendant text content for the first strongly-typed character, but **excludes the text of any descendant that itself has its own `dir` attribute set** (that descendant establishes its own bidi context). The note box `<div dir="auto">` contained an icon `<svg>` (no text) followed by `<span dir="auto">{comment}</span>`. Because the span had its own `dir` attribute, the box's scan skipped it entirely, found no strong characters anywhere else (the icon contributes none), and always resolved to `ltr` — regardless of the actual comment language. This is why the icon never moved to the right for Arabic notes even after Addendum 3's fix: the box's `dir="auto"` was never actually seeing the Arabic text at all.

Confirmed live: `getComputedStyle(box).direction` was `"ltr"` for a box wrapping `"هذا اختبار"` while the span had `dir="auto"`; removing the span's `dir` attribute (leaving only the box's) immediately flipped it to `"rtl"`.

**Decision:** Remove `dir="auto"` from the inner `<span>` — keep it only on the outer box `<div>`. The span has no `dir` of its own, so it inherits the box's correctly-detected resolved direction via normal CSS inheritance (this works fine for plain elements with no explicit `dir`, per Addendum 1's "form controls vs plain elements" distinction).

**Verified Test Cases (live, via `fetch('/api/marks')` + `getComputedStyle`):**
- Arabic comment ("هذا اختبار", "هذه ملاحظة", "ملاحظة أخرى") → box computed `direction: rtl`, icon visually right, text right-aligned.
- English comment ("This is just a note") → box computed `direction: ltr`, icon visually left, text left-aligned.
- Both in the same `en`-locale My Marks page render, confirming detection is content-based, not locale-based, per Addendum 3's intent.

**Files to Change:**
- `app/components/marks/MyMarksList.tsx` — remove `dir="auto"` from the note-preview `<span>` (~line 243). The box container keeps its `dir="auto"` (Addendum 3).

**What NOT to Do (addendum-specific):**
- Do not set `dir="auto"` (or any explicit `dir`) on both a container and a text-bearing descendant within it when the container's own `dir="auto"` is meant to auto-detect from that descendant's content — the descendant's own `dir` attribute makes the container's algorithm skip it entirely. Only one element in a "detect direction from this text" chain should carry the `dir` attribute; let inheritance carry the resolved direction to plain (non-form-control) descendants.

## Addendum 5 — cross-tab error leakage, wrong default My Marks tab, stale comment

**Date:** 2026-07-11

**Root cause 1 (cross-tab error leakage):** `MarkModal.tsx` has a single `const [error, setError] = useState(false)`, passed as the `error` prop to both `BookmarksTab` and `NotesTab`. `saveMark`/`removeMarkType` — the one handler both tabs' actions funnel through — sets this same flag regardless of which `markType` failed. A failed save does not close the modal (only success does), so a failed note save leaves `error: true` and the modal open; switching to the Bookmarks tab then renders "Something went wrong. Try again." there too, even though nothing was attempted on that tab (and vice versa). Found by `/review-fq-work`.

**Root cause 2 (wrong default My Marks tab):** `MyMarksList.tsx`'s `<Tabs defaultValue="red">` is hardcoded. A user with notes and/or blue/green marks but no red marks lands on an empty "No marks in this color yet." tab on open, hiding their actual content. Found by `/review-fq-work`.

**Root cause 3 (stale comment):** `app/api/mushaf/access.ts:37`'s comment says "own marks render via `is_own`, never `author_name` (see QuranSafha's `markedByName`)" — this feature (main plan, Files to Change) renamed `MarkModal`'s single `markedByName` prop to `colorAuthorName`/`noteAuthorName`, so the pointer is now dangling. Found by `/review-fq-work`.

**Decision:**
1. Replace `MarkModal`'s single `error` boolean with `const [errors, setErrors] = useState({ color: false, note: false })`. `saveMark`/`removeMarkType` set/clear only `errors[markType]` (`setErrors(prev => ({ ...prev, [markType]: value }))`). `BookmarksTab` receives `error={errors.color}`, `NotesTab` receives `error={errors.note}` — independent, matching the per-`mark_type` attribution pattern this feature already established for `colorAuthorName`/`noteAuthorName` (ADR 0022).
2. Compute `MyMarksList`'s default tab from data instead of hardcoding: `defaultValue={buckets.find((b) => b.items.length > 0)?.key ?? "red"}`. Safe because `MyMarksList` already early-returns before the `<Tabs>` render whenever every bucket is empty (the `!hasAnyMarks` check), so at least one bucket always has items at this point — the `?? "red"` fallback is defensive only, never actually reached.
3. Update the stale comment in `app/api/mushaf/access.ts` to reference the current prop names.

**Files to Change:**
- `app/components/MarkModal.tsx` — replace `error`/`setError` with `errors`/`setErrors` as above; update both `TabsContent` blocks' `error` prop.
- `app/components/marks/MyMarksList.tsx` — `<Tabs defaultValue="red">` → `<Tabs defaultValue={buckets.find((b) => b.items.length > 0)?.key ?? "red"}>`.
- `app/api/mushaf/access.ts` — line 37 comment: `markedByName` → `colorAuthorName`/`noteAuthorName`.

**Constraints:**
- Do not add a shared/global error banner — errors stay scoped per tab, consistent with Decision 1.
- Do not change `saveMark`/`removeMarkType`'s signature or the `addPageMark`/`deletePageMark` call shape — only the error-state bookkeeping around them changes.

**What NOT to Do (addendum-specific):**
- Do not "fix" the `.slice()` truncation in `notePreview` (MyMarksList) or `NotesTab`'s textarea `onChange` (MarkModal) for UTF-16 surrogate-pair edge cases, or remove the redundant `maxLength` + `onChange` slice combo in `NotesTab` — both were reviewed and judged not worth the churn (cosmetic edge case; harmless defense-in-depth, respectively).
