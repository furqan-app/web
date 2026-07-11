# ADR 0021: Store word/verse comments as a new Mark.mark_type, with mark_value widened to TEXT

**Date:** 2026-07-11
**Status:** Accepted

## Context

`Mark.mark_value` is `VARCHAR(191)` (Prisma's default `String`), and the model's `mark_type` field already documents `note` as a planned sibling to `color` (schema comment: `mark_type String // note, highlight`). Comments are free text and can exceed 191 characters, and Prisma's default `VARCHAR(191)` truncation already bit this codebase once for `Verse.text_uthmani`/`text_imlaei_simple` (see "Local Development Databases" decision in DECISIONS.md). Separately, a shared mushaf (ADR 0012) lets a color mark and a comment on the same word/verse come from different authors, since each `mark_type` is an independent row keyed by `(marked_type, marked_id, mark_type, to_user)`.

## Options Considered

**Option A — New `Comment` model**
A dedicated table (`marked_type`, `marked_id`, `to_user`, `from_user`, `text`, timestamps) separate from `Mark`. Rejected: duplicates the entire read/write/access-grant path (`upsertMark`/`deleteMark`/`withAuthorNames`, both marks API routes, `useMarks`/`getPageMarks`) for no structural gain — a comment is positionally identical to a color mark, just a different `mark_type` value the model was already designed to hold.

**Option B — Reuse `Mark` with `mark_type: "note"`, widen `mark_value` to `@db.Text`**
No new model, no new API routes. The existing generic `upsertMark`/`deleteMark` (already parameterized over `mark_type`) and the existing marks GET/POST/DELETE routes work unchanged. `mark_value` becomes `@db.Text` so both color names (short) and comments (long) fit the same column.

## Decision

Adopt **Option B**. `mark_type: "note"` is a new value alongside `"color"` on the existing `Mark` model; `mark_value String` becomes `mark_value String @db.Text` via a Prisma migration. Because `mark_type` is part of the unique key `(marked_type, marked_id, mark_type, to_user)`, a word/verse can carry an independent color mark and an independent note mark simultaneously, each with its own author — so per-mark attribution ("Marked by X") must be read per `mark_type`, not once globally for the whole word/verse.

## Consequences

- **+** Zero changes to the write/read/delete path, the access-grant model (ADR 0012), or `getPageMarks`/`useMarks` — `mark_type: "note"` flows through existing generic code.
- **+** A word/verse can hold a color and a note independently (different authors on a shared mushaf, independent lifecycles) with no schema changes beyond the column type.
- **-** `mark_value @db.Text` applies to every mark row, including existing `"color"` rows (short strings) — a minor over-allocation, consistent with how `Verse.text_uthmani` already accepted the same trade-off for verse-length text.
- **-** Any UI that previously assumed "one mark per word/verse" (e.g. `MarkModal`'s single `markedByName` header, `MyMarksList`'s color-only bucketing) must be updated to read attribution and grouping per `mark_type` rather than once per word/verse — done in this task for `MarkModal` and `MyMarksList`; any future `mark_type` must follow the same per-type pattern.
