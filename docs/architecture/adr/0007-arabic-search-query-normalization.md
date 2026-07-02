# ADR 0007: Normalize hamza-alif forms in the incoming search query, not the DB column

**Date:** 2026-07-02
**Status:** Accepted

## Context

Arabic search matching (`app/api/search/*`) uses Prisma's `contains` against text columns sourced from an upstream API (quran.com `qdc`). Columns are not guaranteed to use consistent hamza-alif forms (`أ`/`إ`/`آ` vs bare `ا`), and neither is user input — a query typed with a given hamza form only matches a column using that same exact form.

## Options Considered

**Option A — Normalize the query only**
Strip hamza-alif variants (`أ`/`إ`/`آ` → `ا`) from the incoming query string before passing it to Prisma's `contains`. Works when the target column is already internally consistent (never contains those variants).

**Option B — Normalize both query and column via raw SQL**
Use `prisma.$queryRaw` with a `REPLACE(...)` chain on the column in the `WHERE` clause, plus a normalized query parameter. Needed when the column itself is not internally consistent (contains real hamza-alif forms mixed with bare alif). Keeps matching at the SQL level (preserves the `take`/`orderBy` DB-level cap from the Search decision), but requires raw SQL per affected column.

**Option C — Precomputed normalized column**
Add a new normalized column via migration + scraper backfill, query against that with plain Prisma `contains`. Avoids raw SQL but adds schema surface and requires coordinating with the scraper repo.

## Decision

Verse search (`Verse.text_imlaei_simple`) uses **Option A**: the column is confirmed to contain zero hamza-alif characters across the entire table (verified directly against the DB) — it comes pre-stripped from the upstream API. Normalizing only the query string is sufficient and requires no column-side changes.

Chapter search (`Chapter.name_arabic`) has the same class of asymmetric matching (e.g. querying `الانعام` won't match stored `الأنعام`) but Option A does not apply — `name_arabic` is real Arabic text that genuinely contains hamza-alif forms, so fixing it would require Option B or C. This was evaluated and explicitly accepted as out of scope: chapter names are a small, known, low-cardinality list (114 entries) that users can select visually rather than type from memory, so the asymmetric-match gap is accepted rather than fixed.

## Consequences

- **+** Fixes the reported bug with a small, isolated change — no schema/migration/scraper coordination needed.
- **+** The query-normalization function is written as a shared util, available if chapter search normalization is ever revisited.
- **-** Chapter search retains the same asymmetric-matching characteristic for hamza forms; accepted, not a defect to fix.
- **-** If the upstream API ever changes and starts including hamza-alif forms in `text_imlaei_simple`, this fix silently stops being sufficient — there's no automated check that the column stays hamza-free.
