# 0024 — Color marks encode a semantic category, not a color

**Status:** Accepted
**Date:** 2026-07-13

## Context

Color marks (`Mark.mark_type: "color"`) historically stored a raw color name in
`mark_value` — `"red"`, `"blue"`, `"green"` — with no defined meaning. Users
adopted the colors ad hoc, but the app assigned no semantics, so the three
colors were interchangeable and unmemorable.

We want each mark to carry a defined memorization meaning: نسيان (forgetting),
متشابه (similar), خطأ في التشكيل (tashkeel error), خطأ تجويدي (tajweed error),
تربيط (linking), plus an "other" catch-all, with more categories likely later.

## Decision

**`mark_value` stores a stable category key; the display color is derived from
the category, never persisted.** A single `MARK_CATEGORIES` table maps each key
to its label(s) and its color classes. Adding/recoloring a category is a
config change with no data migration.

`mark_type` **stays `"color"`.** The value's meaning changed, not the type slot.
Keeping `"color"` means no existing row's `mark_type` needs migrating, the
unique key `[marked_type, marked_id, mark_type, to_user]` is unchanged
(still one category per spot per mushaf — the intended "a word is one
classification" rule), and every `mark_type === "color"` check across the
codebase keeps working untouched.

Launch categories and colors:

| Key | ar label | en label | Color |
|---|---|---|---|
| `forgetting` | نسيان | Forgetting | Red |
| `similar` | متشابه | Similar | Orange |
| `tashkeel-error` | خطأ في التشكيل | Tashkeel error | Yellow |
| `tajweed-error` | خطأ تجويدي | Tajweed error | Purple |
| `linking` | تربيط | Linking | Blue |
| `other` | أخرى | Other | Slate |

## Alternatives considered

- **Rename `mark_type` to `"category"`.** Cleaner internal naming, but forces a
  migration of every color row on both `mark_type` and `mark_value` and edits
  to every `"color"` check and the unique constraint semantics — churn and risk
  buying only an invisible internal rename. Rejected.
- **Keep storing the color, attach meaning in a separate field/table.** Makes
  color the identity and meaning secondary — backwards from the goal, and
  re-theming a color would corrupt meaning. Rejected.
- **New `MarkCategory` model / FK.** Over-engineered for a fixed ~6-entry
  enum, and a cross-domain FK would violate the DB-split invariant (ADR 0008).
  Rejected — categories live as an app-side constant.

## Consequences

- Colors are re-themeable and categories are extendable without touching data.
- Legacy `"red"`/`"blue"`/`"green"` values are unknown keys; the render path
  falls back to no highlight for any unrecognized value (test data is
  disposable, so no migration is written).
- The on-page highlight classes (translucent, in `highlight.ts`) and the picker
  chip classes (solid, in `MARK_CATEGORIES`) are two class sets keyed by the
  same category key and must stay in sync by key.
