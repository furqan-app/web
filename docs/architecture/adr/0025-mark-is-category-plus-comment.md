# 0025 — A mark is one row: a category plus an optional comment

**Status:** Accepted
**Date:** 2026-07-13
**Supersedes:** [0022](0022-verse-word-comments-as-mark-type.md)
**Amends:** [0024](0024-color-marks-encode-category.md)

## Context

ADR 0022 modelled comments as a second, independent `Mark` row
(`mark_type: "note"`) sitting alongside a `"color"` row on the same spot — two
rows, two lifecycles, two authors possible on a shared mushaf. ADR 0024 then
made the `"color"` row's value a semantic **category** key and kept
`mark_type: "color"` to minimise churn.

Product direction changed: a comment should not be a free-floating sibling of a
category — it should be a **note attached to a category**. The user picks what a
spot means (نسيان / متشابه / …) and may add a comment explaining it. A
comment with no category is expressed by the `other` category, not by a
separate note row.

## Decision

**Collapse the two mark kinds into one row.** `Mark` drops `mark_type` and
`mark_value`; it gains:

- `category String` — the memorization category key (the six ADR 0024 keys).
- `comment String? @db.Text` — optional free text, `null` when absent.

The unique key becomes `[marked_type, marked_id, to_user]` — **one mark per
spot per mushaf**. `category` is required on every row; `comment` is optional.
Saving writes both together; removing deletes the row (comment included). On a
shared mushaf a mark has a single `from_user` (last-author-wins) — the
per-`mark_type` split authorship of ADR 0022/0012 no longer applies.

The category → color derivation of ADR 0024 is unchanged (colors derived from
`MARK_CATEGORIES`, never persisted; unknown category → no highlight). Only the
column that holds the key (`mark_value` → `category`) and the retention of
`mark_type` change.

## Alternatives considered

- **Keep a vestigial `mark_type: "color"` column.** Lower churn (unique key and
  every `mark_type === "color"` check survive), but leaves a dead
  single-valued column and an unchanged, now-misleading unique key. Rejected —
  the write/read path is being rewritten anyway; an honest schema is worth it.
- **Nullable category + nullable comment (allow comment-only rows).** Rejected:
  the product wants every mark to carry a meaning; `other` already covers
  comment-only intent without a special case or a "at least one is set" rule.
- **Separate `Comment` model.** Same rejection as ADR 0022 Option A — duplicates
  the whole marks path for a positionally identical record.

## Consequences

- **+** One mark per spot: simpler model, one author, one Save/Remove, no
  cross-tab collision tracking in My Marks.
- **+** `comment` is `null`-able TEXT only where needed; `category` is a short
  VARCHAR again (no `@db.Text` over-allocation for the common short value).
- **−** Existing `Mark` rows (legacy `color`/`note`, category rows) do not fit
  the new columns; the table is reshaped via `prisma db push` on disposable test
  data — **no migration is written**.
- **−** A word/verse can no longer carry a color and a note from two different
  authors. Accepted: the merge is the point.
- The `dir="auto"` free-text rules for the comment field and My Marks preview
  (DECISIONS.md, originally ADR 0022) still apply and carry forward.
