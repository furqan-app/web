# Unify Marks: Category + Optional Comment

**Type:** feature
**Date:** 2026-07-13
**Status:** implemented
**Trello:** [#53 Make marks meaningful](https://trello.com/c/h2QcIsJH/53-make-marks-meaningful)
**ADR:** [0025 — A mark is one row: a category plus an optional comment](../architecture/adr/0025-mark-is-category-plus-comment.md)
(supersedes [0022](../architecture/adr/0022-verse-word-comments-as-mark-type.md), amends [0024](../architecture/adr/0024-color-marks-encode-category.md))

## Summary
Marks and comments are currently **two independent `Mark` rows** on the same
spot (`mark_type: "color"` vs `"note"`), each editable/authored separately. Merge
them into **one mark = one memorization category (required) + one optional
comment**. A comment can no longer exist without a category — the `other`
category is the escape hatch for "I just want to comment." The schema drops
`mark_type` and `mark_value`, gaining `category` (VARCHAR) + `comment`
(nullable TEXT); the modal drops its Bookmarks/Notes tabs for a single
picker-then-comment flow. Test data is disposable — a versioned Prisma
migration reshapes the table (App DB uses migrations, not `db push` — ADR 0017).
The migration's **first statement is `DELETE FROM marks;`** so `migrate deploy`
runs cleanly on any environment: no NOT-NULL backfill for `category`, and the
new `[marked_type, marked_id, to_user]` unique index can't collide with legacy
spots that had both a color and a note row. Rollback is roll-forward only
(Prisma has no down migrations); the dropped columns' data is not recoverable
except from a DB backup.

## Approach
- **Schema** (`prisma/app/schema.prisma`): on `Mark`, replace `mark_type` +
  `mark_value @db.Text` with `category String` + `comment String? @db.Text`.
  Unique key becomes `[marked_type, marked_id, to_user]` (one mark per spot per
  mushaf). The six category keys and derived colors from ADR 0024 are unchanged.
- **Write path** collapses to a single upsert: `category` required, `comment`
  optional (stored `null` when blank). Removing a mark deletes the whole row —
  category and comment go together.
- **Modal** is one view: `MarkerColorPicker` (unchanged) + a comment `<Textarea>`
  disabled until a category is selected. One Save (category + optional comment),
  one Remove.
- **Reader page**: category highlight only. The old dotted-underline note cue is
  removed (decision: no on-page comment signal).
- **My Marks**: category tabs only (no Notes tab). A row shows its comment
  preview inline when a comment exists.

## Data Model
| Column | Was | Now |
|---|---|---|
| `mark_type` | `"color"`\|`"note"` | **dropped** |
| `mark_value` | category key OR comment text (`@db.Text`) | **dropped** |
| `category` | — | category key VARCHAR (`forgetting`…`other`) |
| `comment` | — | `String? @db.Text`, `null` when none |
| unique key | `[marked_type, marked_id, mark_type, to_user]` | `[marked_type, marked_id, to_user]` |

## Decision Tree / Logic
- **Save mark**: category must be set → upsert row on unique key
  `[marked_type, marked_id, to_user]`; `update: { from_user, category, comment }`,
  `create` includes both. `comment` is trimmed; empty → `null`.
- **Remove mark**: delete by `[marked_type, marked_id, to_user]` (drops
  `mark_type` from the delete key). Removes category + comment in one shot.
- **Comment textarea enabled?** Only when a category is selected (new or
  pre-existing). No category selected → dimmed + disabled, Save disabled.
- **Reader highlight**: `category` is a known key → apply
  `HIGHLIGHT_COLORS["${category}-mark"]`; unknown/absent → no highlight
  (ADR 0024 fallback preserved). No comment indicator.
- **Shared mushaf**: viewer editing an owner's mark overwrites category+comment
  and sets `from_user = viewer` (last-author-wins, single author per mark — the
  per-`mark_type` split authorship of ADR 0022/0012 is gone by design).

## Verified Test Cases
- **New: pick `similar`, no comment** → row `category:"similar", comment:null`;
  orange highlight; appears in Similar tab; no comment box in My Marks row.
- **New: pick `other`, type "check tajweed here"** → row
  `category:"other", comment:"check tajweed here"`; slate highlight; comment
  preview shows in the Other tab row. (This is the comment-only intent.)
- **Edit existing `forgetting` mark, add a comment** → same row updated in place
  (unique key unchanged); category stays, comment set.
- **Remove a mark that has a comment** → whole row deleted; word loses highlight;
  gone from My Marks.
- **Open modal with no category selected** → comment textarea dimmed/disabled,
  Save disabled until a category chip is tapped.
- **Legacy `mark_value:"red"` / old `note` rows** → cleared by the migration's
  `DELETE FROM marks;` first statement (disposable data); not data-migrated.

## My Marks Filter & Layout (follow-on)
Six category tabs (`flex-1` + `w-full`) overflow the viewport on mobile — a
regression from the 3–4 tab layout. Fix, plus two requested improvements:
- **Controlled active filter** (`useState`, replaces uncontrolled shadcn Tabs),
  with a new **"All"** bucket that lists every mark across categories. **All is
  the default view.**
- **Responsive filter control** — on mobile (`< md`) a `DropdownMenu` (Radix; no
  `select` primitive exists) whose trigger shows the active filter (colour dot +
  label + chevron); on `md+` a **wrapping** pill-chip row (`flex-wrap`, chips are
  auto-width, not `flex-1`) so all 7 filters are visible without overflow.
- **Full-width rows** — each mark card is `w-full`.
- i18n: add `marks.allLabel` ("All" / "الكل") + a filter aria-label.
- Only `MyMarksList.tsx` + `messages/*` change; the data layer is untouched.

## Files to Change
- `app/components/marks/MyMarksList.tsx` — controlled active filter + "All"
  bucket (default); responsive `DropdownMenu` (mobile) / wrapping chips (md+);
  full-width rows. (Follow-on section above.)
- `prisma/app/schema.prisma` — swap `mark_type`/`mark_value` for
  `category`/`comment`; new unique key. Generate + apply a Prisma migration
  (`app-migrate-dev`, ADR 0017) + `prisma-generate`.
- `app/api/mushaf/access.ts` — `MarkBody` → `{ marked_type, marked_id, category, comment? }`;
  `upsertMark` requires category, writes comment (null when blank), keys on the
  3-field unique key; `deleteMark` keys on `[marked_type, marked_id, to_user]`.
- `app/server/actions/addPageMark.ts` — `AddMarkData` carries `category` +
  optional `comment` (drop `mark_type`/`mark_value`).
- `app/server/actions/deletePageMark.ts` — `DeleteMarkData` drops `mark_type`.
- `app/utils/marks.ts` — replace the four `getColorMark*`/`getNoteMark*` helpers
  with one `getMark`/`getMarkMeta` returning `{ category, comment, authorName, isOwn }`.
- `app/server/actions/getPageMarks.ts` — `PageMark` carries `category` +
  `comment` + author fields; one mark per `marked_id` (unique key guarantees it).
- `app/components/QuranWord.tsx` — read `category` from the single mark; drop
  `hasNote`/dotted-underline; highlight logic otherwise unchanged.
- `app/components/QuranSafha.tsx` — pass `currentCategory`, `currentComment`,
  single `authorName` to the modal (drop the separate color/note author props).
- `app/components/MarkModal.tsx` — remove `Tabs`; single flow: picker + comment
  textarea (disabled until a category is chosen); `saveMark(category, comment)`,
  `removeMark()`. Drop `BookmarksTab`/`NotesTab` split and the two-error state.
- `app/components/marks/MyMarksList.tsx` — buckets = `MARK_CATEGORIES` only (drop
  `noteBucket`); each row renders its `comment` preview when present; `markKey`
  drops `mark_type`; remove drops `mark_type`.
- `app/api/marks/route.ts` (My Marks GET) & `app/api/quran/pages/[pageId]/marks/route.ts`
  — return `category` + `comment`; drop the `mark_type in [...]` filter.
- `app/types/index.ts` / `app/types/prisma` — update any `mark_type`/`mark_value`
  types.
- `messages/en.json` & `messages/ar.json` — drop tab keys (`bookmarksTab`,
  `notesTab`, `saveNote`, `removeNote`) if now unused; add `commentPlaceholder`
  and any single-flow labels; keep the six category keys. Run
  `npm run extract-translations`.
- `docs/architecture/adr/0025-mark-is-category-plus-comment.md` — new ADR.
- `docs/architecture/DECISIONS.md` — mark the "Verse/Word Comments" (ADR 0022)
  section superseded; update the ADR 0024 "Color Marks" section (no more
  `mark_type`, new unique key); add the ADR 0025 summary.

## Constraints
- One row per spot per mushaf: unique key `[marked_type, marked_id, to_user]`.
- `category` is required on every mark; `comment` is optional (`null` when blank).
- Category set stays a fixed app-side constant (`MARK_CATEGORIES`), no DB
  model/FK (ADR 0008). Highlight + chip class sets stay literal Tailwind strings
  keyed by category (ADR 0024).
- Comment textarea + My Marks comment preview keep `dir="auto"` on exactly one
  element in the chain (free-text direction rule, DECISIONS.md ADR 0022 note —
  carry this forward even though 0022 is superseded).
- No data-preserving migration; the App DB migration (ADR 0017) drops old rows.

## What NOT to Do
- Do not keep a vestigial `mark_type` column — it is dropped entirely.
- Do not allow a comment without a category (use `other` for comment-only).
- Do not add an on-page comment indicator (highlight only).
- Do not preserve per-field (color vs note) authorship — one `from_user` per row.
- Do not add a categories DB table/enum or interpolate Tailwind color classes.

## Decisions Made
- Comment requires a category; `other` covers comment-only intent (Q1).
- One author per mark; per-`mark_type` split authorship dropped (Q2).
- `mark_type` column dropped; category + comment in one row (Q3).
- Highlight only on the reader page; no comment cue (Q4).
- Data is disposable — reshape via an App DB migration (ADR 0017); old rows
  cleared, not data-migrated.
