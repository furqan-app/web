# Marks — Decisions

Active decisions for marks & sharing — categories, comments, shared mushaf access. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Shared Mushaf Access

**Status:** active

**Decision:** A user can view and edit another user's mushaf marks. Access is granted by redeeming a **one-time share code** the owner generates (the code *is* the consent — no approval step, no directory/user-search). Redeeming a code creates a persistent `MushafAccessGrant` (`owner_user` → `viewer_user`) and marks the code spent. The viewer opens the mushaf at the dedicated route `/[locale]/mushaf/[grant]/pages/[id]` (`[grant]` = the grant's random id) and reads/writes marks via `/api/mushaf/[grantId]/pages/[pageId]/marks`. See [ADR 0012](../adr/0012-shared-mushaf-access.md).

**Constraints:**
- New models (`MushafAccessGrant`, `MushafShareCode`) live in `furqan_app` only and reference users by scalar `Int` id (no Prisma relations), matching `Mark` and preserving ADR 0008's no-cross-domain-FK invariant.
- No change to `Mark`: the unique key stays `[marked_type, marked_id, mark_type, to_user]` (one mark per spot per mushaf, **last author wins**). Grant-scoped writes set `to_user = grant.owner_user`, `from_user = authenticated user`.
- The grant id in the URL is **not** a capability — every grant-scoped endpoint (marks GET/POST/DELETE and the `/mushaf/[grant]` page/layout) must re-verify `grant.viewer_user === extractUser(request).id` server-side. A random grant id mitigates enumeration but does not replace this check.
- Marks responses now include `from_user` and the author's display name so any viewer can see who made each mark. Author is surfaced in `MarkModal`. `getColorMark`/existing consumers must stay backward-compatible (fields added, none removed).
- Add `/api/mushaf/[0-9a-z]+/pages/[0-9]+/marks` to the `auth-middleware` `protectedRoutes` matcher — new protected routes require the same middleware coverage as the self marks route (see Middleware Chain).
- The `/mushaf/[grant]/...` reader reuses the self-reader components but must thread a **base path** (`/${locale}/mushaf/${grant}/pages` vs `/${locale}/pages`) through page-navigation links (arrows, `QuranSwipeNav`, `Sidebar`), or navigation silently falls back to the viewer's own mushaf. Revocation is owner-driven and immediate.
- **Implementation:** the self and grant readers share one server component, `app/components/reader/ReaderPage.tsx` (params `basePath` + optional `grantId`) — the self `pages/[id]/page.tsx` keeps `generateStaticParams`; the grant `mushaf/[grant]/pages/[id]/page.tsx` omits it (dynamic). Sidebar/search links (`SurahListItem`, `RubList`, `SearchQueryResults`) derive the prefix at render time from `useReaderBasePath()` (reads the locale-less pathname) rather than prop-threading — this is why they stay grant-aware even though `SearchBar` lives in the global nav above the grant layout. Don't reintroduce hardcoded `/pages/...` hrefs in those components.

---

## Verse/Word Comments

**Status:** active

> **SUPERSEDED by [ADR 0025](../adr/0025-mark-is-category-plus-comment.md) / "A Mark Is a Category Plus an Optional Comment" below.** Comments are no longer an independent `mark_type: "note"` row — they are an optional `comment` column on the single mark row. The `dir="auto"` free-text rules below still apply.

**Decision:** Comments are a new `Mark.mark_type: "note"` value, not a new model — `mark_value` is widened from `VARCHAR(191)` to `@db.Text` to hold free text. See [ADR 0053](../adr/0053-verse-word-comments-as-mark-type.md).

**Constraints:**
- The generic `upsertMark`/`deleteMark`/marks API routes/`getPageMarks`/`useMarks` require no changes — they already parameterize over `mark_type`.
- A word/verse can carry an independent `"color"` mark and `"note"` mark simultaneously (separate rows under the same unique key shape), each with its own author. Any UI showing "Marked by X" attribution must read it **per `mark_type`**, never once for the whole word/verse — `MarkModal`'s Bookmarks and Notes tabs each show their own author independently, since a shared-mushaf color and note on the same spot can come from different people.
- A verse-level note (added via the end-of-verse marker, same trigger as verse color marks) reuses the existing mechanism where `marks[verse_key]` is spread onto every word in that verse (`QuranLine`) — no separate code path for "note belongs to a verse vs a word."
- No hover tooltip — the reader shows only a `border-b-2 border-dotted border-primary` indicator on any word carrying a note; reading/editing the comment happens in `MarkModal`'s Notes tab (same click/tap that already opens the modal for color marks).
- `/api/marks` (My Marks page) fetches both `"color"` and `"note"` mark types; `MyMarksList` buckets by `mark_type`, not by color key alone — a word/verse with both a color and a note appears once in its color tab and once in the new Notes tab, since they are independent `Mark` rows.
- Comment text (the Notes tab `<Textarea>`, the My Marks comment preview) uses `dir="auto"`, not the locale-locked `dir={getLanguageDirection(locale)}` pattern every other RTL-sensitive element in this codebase uses — free-form user text should render by its own content direction (an `ar`-locale user can write an English note and vice versa). Every other element (UI chrome, Quran text) keeps the existing locale-locked or Quran-text-locked convention; do not spread `dir="auto"` beyond actual free-text user content. Form controls (`input`/`textarea`/`select`) do not reliably inherit `direction` from an ancestor `<html dir>` in this codebase's experience — always set `dir` explicitly on them, never rely on inheritance.
- When a container's `dir="auto"` is meant to auto-detect direction from a specific text-bearing descendant (e.g. the My Marks note box — a flex row with an icon + comment text, where the icon's side should flip with the comment's language), **do not also put `dir="auto"` (or any explicit `dir`) on that descendant.** Per the HTML living standard, an element's `dir="auto"` scan for the first strongly-typed character explicitly **excludes the text of any descendant that has its own `dir` attribute** (that descendant is treated as its own bidi context). Two `dir="auto"` on both container and descendant means the container's scan finds nothing (skips the only text-bearing child) and always resolves to `ltr`, regardless of actual content — confirmed live via `getComputedStyle` (`docs/plans/verse-word-comments.md` Addendum 4). Put `dir="auto"` on exactly one element in the chain — the outermost one whose layout should react to the content — and let plain (non-form-control) descendants inherit the resolved `direction` via normal CSS inheritance.

---

## Color Marks Are Semantic Categories

**Status:** active

**Decision:** A mark stores a stable **category key** (`forgetting`, `similar`,
`tashkeel-error`, `tajweed-error`, `linking`, `other`), not a color. The display
color is **derived** from the category via a single `MARK_CATEGORIES` table
(`app/constants/marks.ts`) — color is never persisted. See
[ADR 0024](../adr/0024-color-marks-encode-category.md).

> **Amended by [ADR 0025](../adr/0025-mark-is-category-plus-comment.md) below:** the
> category is stored in a dedicated `category` column (not `mark_value`), and
> `mark_type` is dropped — a mark is one row (category + optional comment). The
> category → color derivation and the fixed-constant / literal-Tailwind rules
> below are unchanged.

**Constraints:**
- The unique key `[marked_type, marked_id, to_user]` (per ADR 0025) allows one
  category per spot per mushaf (a word/verse is a single classification).
- The category set is a fixed app-side constant, not a DB model/FK — a
  cross-domain FK would break the DB split (ADR 0008). New categories are added
  by extending `MARK_CATEGORIES`.
- Two class sets are keyed by the same category key and must stay in sync:
  the **solid** picker/My-Marks chip classes live in `MARK_CATEGORIES`; the
  **translucent** on-page highlight classes live in `highlight.ts`
  (`HIGHLIGHT_COLORS`, keyed `${categoryKey}-mark`). Both must be **literal**
  Tailwind class strings (never interpolated) so JIT emits them.
- The render path must fall back to **no highlight** for any unrecognized
  `category` — legacy `red`/`blue`/`green` rows are unknown keys. No data
  migration is written (test data is disposable); do not add one.
- `highlight.ts`'s `HighlightType` union mixes two different meanings under one
  type: the `${categoryKey}-mark` keys (`forgetting-mark`, `linking-mark`, etc.)
  are colors for a **persisted** `Mark.category`, while `search`/`selection`/
  `last-read` are **ephemeral, URL-param-driven** pointers with no DB row
  behind them. Never reuse a `-mark` key for a temporary "point at this verse"
  link (e.g. a shared-verse deep link) — it would make that temporary state
  visually indistinguishable from someone's actual saved mark of that category
  on an unrelated verse. Use `selection` (or add a new non-`-mark` type) for
  anything that isn't backed by a real `Mark` row. Found via `docs/plans/copy-share-verses.md`'s share-verse deep link, which initially picked `linking-mark` by mistake.

---

## A Mark Is a Category Plus an Optional Comment

**Status:** active

**Decision:** A `Mark` is **one row per spot per mushaf** carrying a required
`category` (VARCHAR, the ADR 0024 key) and an optional `comment` (`String? @db.Text`,
`null` when absent). `mark_type` and `mark_value` are **dropped**; the unique key
is `[marked_type, marked_id, to_user]`. A comment cannot exist without a category
— the `other` category is the comment-only escape hatch. See
[ADR 0025](../adr/0025-mark-is-category-plus-comment.md) (supersedes ADR 0053,
amends ADR 0024).

**Constraints:**
- One `from_user` per mark (last-author-wins on a shared mushaf) — the
  per-`mark_type` split authorship of ADR 0053/0012 is gone. "Marked by X" is
  shown once per mark, not per field.
- The modal is a single flow (no Bookmarks/Notes tabs): category picker + a
  comment textarea disabled until a category is selected. Save writes both;
  Remove deletes the whole row.
- Reader page shows the category highlight only — **no on-page comment
  indicator** (the old dotted-underline note cue is removed).
- My Marks buckets by category only; a row renders its `comment` preview inline
  when present. The `dir="auto"` free-text rules (Verse/Word Comments section
  above) still govern the comment textarea and preview.
- Schema reshape via `prisma db push` on disposable data — no migration script.
