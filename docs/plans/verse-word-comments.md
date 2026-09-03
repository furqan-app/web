---
title: Verse/Word Comments
type: feature
date: 2026-07-11
status: implemented
area: marks
---

# Verse/Word Comments

## Summary

Users can already color-mark a word or verse. This adds a second, independent kind of mark — a free-text **comment** — on the same word/verse, using the `Mark` model's already-documented (but unimplemented) `mark_type: "note"`. A word/verse carrying a comment gets a `border-b-2 border-dotted border-primary` indicator in the reader; there is no hover tooltip. Reading/writing the comment happens in `MarkModal`'s existing "Notes" tab, which today just shows a "Coming soon" placeholder. The My Marks page gets a 4th tab listing comments alongside the existing 3 color tabs.

See [ADR 0053](../architecture/adr/0053-verse-word-comments-as-mark-type.md) for why this reuses `Mark` instead of a new model, and the "Verse/Word Comments" entry in `DECISIONS.md` for the resulting constraints.

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
| Notes | `getNoteMarkMeta(marks).authorName`, shown only if `!isOwn` | New — independent because a shared mushaf can have a different author per `mark_type` on the same spot (ADR 0053) |

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
  - Replace the `NotesTab` "Coming soon" placeholder with a real implementation: textarea (shadcn `Textarea` — needs `npx shadcn@latest add textarea`, none exists yet), `dir="auto"` on the `<Textarea>` (form controls need explicit `dir`), `maxLength={500}` + character counter, Save button (calls `addPageMark` with `mark_type: "note"`), Remove button (shown only when a note currently exists, calls `deletePageMark` with `mark_type: "note"`), offline-disabled state and error state mirroring `BookmarksTab`.
  - Prefill the textarea from a new `currentNote`/`noteAuthorName` prop pair (parallel to `currentColor`/existing `markedByName`).
  - Move "Marked by X" out of the shared modal header into each tab's own content — `BookmarksTab` shows the color mark's author, `NotesTab` shows the note's author, each independently gated on its own `!isOwn`.
  - Per-tab error state: `const [errors, setErrors] = useState({ color: false, note: false })` (not one shared `error`) — `saveMark`/`removeMarkType` set only `errors[markType]`; `BookmarksTab` gets `error={errors.color}`, `NotesTab` gets `error={errors.note}`. A shared flag leaked a failed note save into the Bookmarks tab.
- `app/components/QuranSafha.tsx` — alongside the existing `getCurrentColorMeta`, add a `getCurrentNoteMeta` using `getNoteMarkMeta`; pass both down to `MarkModal` (new `currentNote`/`noteAuthorName` props replacing the single `markedByName` prop, which moves per-tab as above).
- `app/api/marks/route.ts` — drop the `where: { mark_type: "color" }` filter (fetch `"color"` and `"note"` together); generalize `MarkListItem` so the shared field carries either a color key or comment text, discriminated by a `mark_type` field on each item (word/verse lookup logic for snippet/chapter/verse stays the same, since it's keyed off `marked_type`/`marked_id`, not `mark_type`).
- `app/server/actions/getAllMarks.ts` — re-exports `MarkListItem`; no logic change needed beyond the type update flowing through.
- `app/components/marks/MyMarksList.tsx` — add a 4th tab ("Notes") alongside the 3 `MARK_COLORS` tabs; bucket notes by `mark_type === "note"` instead of by color key; render a `SquarePen` icon + truncated comment preview inside a `<div dir="auto" className="mt-1 rounded-md bg-muted/50 border border-border/60 px-2.5 py-1.5 flex items-center gap-1">` — **no `dir` on the inner `<span>`** (see the `dir="auto"` rule in Constraints); delete button passes `mark_type: "note"`. `<Tabs defaultValue={buckets.find((b) => b.items.length > 0)?.key ?? "red"}>` — not a hardcoded `"red"`, or a user with only blue/green marks lands on an empty tab.
- `app/api/mushaf/access.ts` — stale comment (was `markedByName`, now `colorAuthorName`/`noteAuthorName`).
- `app/constants/marks.ts` — no change to `MARK_COLORS`; may add a note-tab label constant here if useful for i18n key consistency.
- `messages/ar.json` / `messages/en.json` — new translation keys for: Notes tab textarea placeholder, save/remove button labels (`NotesTab` already has `markModal.notesTab`/`markModal.notesComingSoon` keys to replace), My Marks Notes tab label, empty-state copy.
- `docs/architecture/COMPONENTS.md` — per CLAUDE.md's "update after adding/removing/reorganising components" rule:
  - Add `Textarea` to the `components/ui/` primitives line (Zone: shared / UI primitives).
  - Update the `MarkModal` line (Zone: reader) — currently documents a single `"Marked by {name}"` behavior; must reflect that attribution is now shown per-tab (Bookmarks vs Notes), independently.
  - Update the `MyMarksList` line (Zone: marks) — currently says "fetches all of the caller's **color** marks... groups into red/blue/green sections"; must note the 4th Notes tab and that it now fetches both `mark_type`s.

## Decisions Made

- Comments are a second `mark_type: "note"` on the same generic path, not a new model or feature surface (ADR 0053).
- Comment text uses `dir="auto"` (free-form user content); one `dir` per direction-detection chain, none on the inner span.
- Per-tab error state and a data-derived default tab in `MyMarksList` (both from a `/review-fq-work` pass).

## Revision History

- 2026-07-11 — folded Addendum 1 (`dir="auto"` on comment elements): comment text detects its own direction; exactly one element per detection chain may carry `dir`, and the inner text `<span>` must have none (the container's scan skips any `dir`-bearing descendant).
- 2026-07-11 — folded Addendum 5 (`/review-fq-work`): per-tab `errors` object (a shared flag leaked a failed note save into the Bookmarks tab); `MyMarksList` default tab derived from the first non-empty bucket, not hardcoded `"red"`; stale `markedByName` comment in `app/api/mushaf/access.ts` fixed.

## Files to Check (read, not modify)

- `docs/architecture/COMPONENTS.md` — read before touching `MarkModal`/`MyMarksList`/`QuranWord` to confirm no other caller assumes single-attribution or color-only marks beyond what's listed above (per CLAUDE.md's "check this file to understand all callers" rule).

## Constraints

- Do not create a new Prisma model for comments — reuse `Mark` with `mark_type: "note"` (ADR 0053).
- Do not add a hover tooltip anywhere — the border-bottom is the only passive indicator; reading the comment always goes through `MarkModal`.
- Do not merge color and note attribution into one `markedByName` — they must be read and displayed independently per tab, since a shared mushaf can have different authors per `mark_type` on the same word/verse.
- Do not special-case verse-level notes with new spread logic — reuse the existing `marks[verse_key]` → every word in `QuranLine` mechanism that color marks already rely on.
- Do not change the generic write/delete/read path (`upsertMark`, `deleteMark`, the marks API routes, `useMarks`/`getPageMarks`) — they are already parameterized over `mark_type` and require zero changes.
- **`dir="auto"` chain rule:** comment text gets `dir="auto"` (a deliberate deviation from the codebase's locale-locked `dir`, because it is free-form user content). Only **one** element in a "detect direction from this text" chain may carry `dir` — put it on the `<Textarea>` and on the note-box container `<div>`, and put **no** `dir` on the inner text `<span>`. Per the HTML living standard, `dir="auto"` on a container skips any descendant that itself has a `dir` attribute; with `dir="auto"` on both, the container's scan skips the span, finds only an SVG icon, and resolves to LTR. Verified live. Let CSS inheritance carry the resolved direction to plain descendants.

## What NOT to Do

- Do not apply `dir="auto"` anywhere outside comment text — the rest of the codebase stays locale-locked.
- Do not put `dir` on more than one element in a direction-detection chain (see the rule in Constraints) — the inner text `<span>` must have none.
- Do not share one `error` flag across the Bookmarks and Notes tabs — a failed note save then renders "Something went wrong" in Bookmarks too. Use a per-tab `errors` object.
- Do not hardcode `<Tabs defaultValue="red">` in `MyMarksList` — derive it from the first non-empty bucket.
