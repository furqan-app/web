---
title: My Marks Page
type: feature
date: 2026-07-09
status: implemented
area: marks
---

# My Marks Page

## Summary

Users can bookmark-color words/verses (red/blue/green) via `MarkModal`, but the only way to see what's marked is to page through the mushaf. This adds a dedicated `/marks` page listing all of the current user's color marks, grouped by color, each linking back to the marked page and removable in place.

Scope is self-marks only — no grant/shared-mushaf viewing (that's a separate future task if ever needed) — and color marks only (`mark_type: "color"`); the `notes` mark type is still stubbed/unimplemented elsewhere and stays out of scope here.

## Approach

1. **New API route — `app/api/marks/route.ts`, `GET` only.** Self-only, mirrors the auth pattern of `app/api/quran/pages/[pageId]/marks/route.ts`:
   - `extractUser(request)`, 401 if `null`.
   - `appPrisma.mark.findMany({ where: { to_user: user.id, mark_type: "color" }, orderBy: { page_number: "asc" } })`.
   - Split results by `marked_type` and batch-enrich from `quranPrisma`:
     - `marked_type === "word"`: `marked_id` is `location`. `quranPrisma.word.findMany({ where: { location: { in: [...] } }, include: { verse: { include: { chapter: true } } } })`. Snippet = that word's `qpc_uthmani_hafs` only (font-encoding contract: use `qpc_uthmani_hafs` for word display outside the page).
     - `marked_type === "verse"`: `marked_id` is `verse_key`. `quranPrisma.verse.findMany({ where: { verse_key: { in: [...] } }, include: { chapter: true, Word: { where: { char_type_name: "word" } } } })`. Snippet = joined `qpc_uthmani_hafs` across those words, truncated to 20 words + `"..."` — same truncation `QuranSafha.tsx`'s `wordClicked` already applies when opening `MarkModal` for a verse mark.
   - Merge back into one array preserving the original `page_number asc` order, shape:
     ```ts
     {
       color: string;        // mark_value: "red" | "blue" | "green"
       marked_type: "word" | "verse";
       marked_id: string;
       page_number: number;
       chapter_name_simple: string;
       chapter_name_arabic: string;
       verse_number: number;
       snippet: string;
     }
     ```
   - Return via `jsonResponse({ data: [...] })`.
   - Add `new RegExp("^/api/marks$")` to `protectedRoutes` in `app/middlewares/auth-middleware.ts`.

2. **Server action — `app/server/actions/getAllMarks.ts`.** Mirrors `getPageMarks.ts`: `fetch("/api/marks")`, returns `response.data` (or `[]` on failure).

3. **Hook — `app/hooks/use-all-marks.ts`.** Mirrors `use-marks.ts`: React Query wrapper around `getAllMarks`, same no-refetch-on-focus/mount/reconnect config (marks only change via explicit user action, consistent with `useMarks`). `queryKey: ["/marks/all"]`. Exposes `reload()` for post-delete invalidation.

4. **Page — `app/[locale]/marks/page.tsx`** (server component, mirrors `app/[locale]/mushaf/page.tsx`'s shape):
   - `setRequestLocale(locale)`, `getServerSession(authOptions)`.
   - Signed out → new `MarksSignedOutPrompt` component (own copy, not a reuse of `mushaf/SignedOutPrompt` — that component's copy is mushaf-specific ("share your mushaf")). Same visual shape (icon + message + sign-in button), new translation key.
   - Signed in → renders `<MyMarksList />` client component.

5. **`app/components/marks/MyMarksList.tsx`** (client component):
   - `useAllMarks()` for data, loading, and `reload`.
   - **Whole-page empty state first** (all buckets empty → `marks.empty`), shown instead of tabs.
   - Otherwise shadcn `Tabs` (as in `MarkModal.tsx`): `Red → Blue → Green` (plus the `Notes` tab from `verse-word-comments.md`). All tabs always render; empty tab shows a per-color empty message (`marks.emptyColor`). Default tab is the first bucket with items (`buckets.find((b) => b.items.length > 0)?.key ?? "red"`), not hardcoded. Tabs are not hidden when empty and the selected tab is not persisted.
   - Within each tab, items are sorted by Quran order `(surah, verse, wordPos)` (server-side — see Decision Tree) and **grouped contiguously by surah** via a `groupBySurah(items)` linear scan on `chapter_name_simple`. Each group gets a `sticky top-0 z-10 bg-muted border-y border-border` divider with the locale-aware surah name and `dir={locale === "ar" ? "rtl" : "ltr"}` on the **outer** `<div>` (span-only `dir` doesn't fix block alignment). Nav is not `fixed`/`sticky`, so `sticky top-0` needs no offset. No surah number / page badge on the divider.
   - Each row: color swatch (`Bookmark` chip styling from `MarkerColorPicker`), locale-aware `chapter_name_*` + `toLocaleNumeral(verse_number, locale)`, snippet in `font-uthmanic` RTL, page number, wrapped in `Link href={`/pages/${page_number}`}` (hardcoded — self-marks only).
   - Remove button per row: icon button, `e.preventDefault()`/`stopPropagation()`, calls existing `deletePageMark({ page_number, marked_type, marked_id, mark_type: "color" })`, then `reload()` on success.
   - Pagination is handled per `paginate-my-marks.md`.

6. **Nav entry point — `app/components/nav/MarksLink.tsx`**, mirrors `SharedMushafLink.tsx` exactly (always-visible icon+label link, icon-only on mobile via `hidden md:inline` on the label). Uses a `Bookmark` icon (matches the mark-color chip icon already used in `MarkerColorPicker`/`QuranWord`'s bookmark imagery) linking to `/marks`. Added into `Nav.tsx` next to `SharedMushafLink`.

7. **Translations** — add to `messages/en.json` / `messages/ar.json`:
   - `marks.navLink` ("My Marks" / "علاماتي")
   - `marks.pageTitle` ("My Marks" / "علاماتي")
   - `marks.signedOut` ("Sign in to see your marks." / "سجّل الدخول لرؤية علاماتك.")
   - `marks.empty` ("No marks yet." / "لا توجد علامات بعد.")
   - Reuses existing `markModal.redMark`/`greenMark`/`blueMark`/`removeMark` for group headers and the remove button's `aria-label` — no duplication.

## Decision Tree / Algorithm

| marked_type | `marked_id` is | Quran lookup | Snippet source |
|---|---|---|---|
| `word` | `location` (e.g. `"2:255:5"`) | `word.findMany({ location: { in } })` incl. `verse.chapter` | that word's `qpc_uthmani_hafs` only |
| `verse` | `verse_key` (e.g. `"18:10"`) | `verse.findMany({ verse_key: { in } })` incl. `chapter`, `Word` filtered `char_type_name: "word"` | joined `qpc_uthmani_hafs` across those words, truncated to 20 + `"..."` |

**Sort within each color bucket** — by Quran reading order, not `page_number` (a page can span surahs/verses). Sorted **server-side** in `app/api/marks/route.ts`, parsed from `marked_id`/`verse_key` only (no new joins):

| marked_type | Source | Sort key |
|---|---|---|
| `word` | `location` = `"s:v:w"` | `(s, v, w)` |
| `verse` | `verse_key` = `"s:v"` | `(s, v, Infinity)` — after every word of that verse |

Verified: red bucket `["2:255:5", "2:255" (verse), "2:255:2", "18:10:1"]` → `2:255:2` → `2:255:5` → `2:255` → `18:10:1`.

Grouping: bucket rows by `color` (`red`/`blue`/`green`, + `note` for the Notes tab); render as always-visible `Tabs`; within a tab, group contiguous runs by surah with a sticky divider; whole-page empty state if every bucket is empty.

Removal: existing `deletePageMark` action, unchanged — every row already carries the exact fields it needs.

## Verified Test Cases

1. **Word mark**, `location: "2:255:5"`, `mark_value: "red"`, `page_number: 42` → row: red swatch, "Al-Baqarah · ٢٥٥" (or "Al-Baqarah · 255" in `en`), snippet = the single word's `qpc_uthmani_hafs`, links to `/pages/42`.
2. **Verse mark**, `verse_key: "18:10"`, `mark_value: "blue"`, `page_number: 296` → row: blue swatch, "Al-Kahf · ١٠", snippet = that verse's words joined (≤20 words, else truncated + "..."), links to `/pages/296`.
3. **No marks at all** → signed-in user sees the empty state, no color sections rendered.
4. **Only red marks exist** → only the Red section renders; Blue/Green sections are omitted entirely (not rendered empty).
5. **Signed out** → `MarksSignedOutPrompt`, no data fetch attempted (server component branches before rendering `MyMarksList`).

## Files to Change

- `app/api/marks/route.ts` — new, `GET` only, self-only enriched marks list; sorts each result by `(surah, verse, wordPos)` parsed from `marked_id`/`verse_key`
- `app/middlewares/auth-middleware.ts` — add `/api/marks` to `protectedRoutes`
- `app/server/actions/getAllMarks.ts` — new, mirrors `getPageMarks.ts`
- `app/hooks/use-all-marks.ts` — new; `queryKey: ["/marks", "all"]`; `reload` → `queryClient.invalidateQueries({ queryKey: ["/marks"] })`; `staleTime: Infinity` (not `refetchOnMount: false`); keep `refetchOnWindowFocus/Reconnect/Interval: false`
- `app/hooks/use-marks.ts` — `reload` → same `["/marks"]`-prefix invalidation; `staleTime: Infinity` instead of `refetchOnMount: false`
- `app/[locale]/marks/page.tsx` — new route, mirrors `app/[locale]/mushaf/page.tsx`'s session-branch shape
- `app/components/marks/MarksSignedOutPrompt.tsx` — new, own copy (not a reuse of the mushaf one)
- `app/components/marks/MyMarksList.tsx` — new: `Tabs` (Red/Blue/Green + Notes), per-tab Quran-order + `groupBySurah` sticky dividers, remove action, whole-page empty state
- `app/components/nav/MarksLink.tsx` — new, mirrors `SharedMushafLink.tsx`
- `app/components/nav/Nav.tsx` — add `<MarksLink />` next to `<SharedMushafLink />`
- `messages/en.json`, `messages/ar.json` — `marks.*` keys incl. `marks.emptyColor`

## Constraints

- Self-marks only — do not add grant/`grantId` awareness to any new file in this pass (no `basePath` threading, no `/mushaf/[grant]/marks`).
- `mark_type: "color"` only — do not attempt to branch on or render `note`-type marks; that mark type has no write path yet anywhere in the app.
- Do not add a new DELETE endpoint — reuse `deletePageMark`/the existing `DELETE` handler on `app/api/quran/pages/[pageId]/marks/route.ts` as-is.
- Do not use `verse.text_uthmani` for the verse-mark snippet — always join `word.qpc_uthmani_hafs` per the Font System encoding contract in `DECISIONS.md`.
- Do not duplicate `markModal.redMark`/`greenMark`/`blueMark`/`removeMark` translation keys — reuse them.
- Do not reuse `mushaf/SignedOutPrompt.tsx` as-is — its copy is mushaf-specific; this page gets its own signed-out component with its own message.
- `useMarks` and `useAllMarks` share the `["/marks"]` query-key prefix; both `reload()`s do `invalidateQueries({ queryKey: ["/marks"] })`; both use `staleTime: Infinity`, **not** `refetchOnMount: false` (the latter skips the stale check unconditionally, so an invalidation while the page was unmounted never refetched). Keep `refetchOnWindowFocus/Reconnect/Interval: false`; do not use `refetchOnMount: "always"`; do not do cross-hook invalidation calls (`MarkModal` importing `useAllMarks`) — the shared prefix makes it unnecessary. Over-invalidation of an inactive query is accepted (marked stale, not eagerly refetched).
- Sort within a bucket is by Quran order `(surah, verse, wordPos)`, done **server-side** — never `page_number asc` (a page spans surahs/verses).
- All colour tabs always render (empty tab → `marks.emptyColor`); default tab is the first non-empty bucket; the selected tab is not persisted; empty tabs are not hidden.
- The surah divider's `dir` goes on the outer `<div>`, not the inner span (span-only `dir` doesn't fix block alignment). No surah number / page badge on it.

## What NOT to Do

- Do not add grant/`grantId` awareness to any file in this pass.
- Do not render `note`-type marks via `mark_type` branching *in the color path* — the Notes tab is `verse-word-comments.md`'s addition.
- Do not add a new DELETE endpoint — reuse `deletePageMark`.
- Do not use `verse.text_uthmani` for the verse-mark snippet — join `word.qpc_uthmani_hafs`.
- Do not duplicate `markModal.redMark`/`greenMark`/`blueMark`/`removeMark` keys.
- Do not set `refetchOnMount: "always"`, hide empty color tabs, persist the selected tab, or sort by `page_number`.

## Revision History

- folded Addendum "cache invalidation + stale mount fix": adding/removing a mark in the reader didn't refresh `/marks` and vice versa. Two passes — share the `["/marks"]` query-key prefix + broad `invalidateQueries`, then **replace `refetchOnMount: false` with `staleTime: Infinity`** (`invalidateQueries` only force-refetches active queries; `refetchOnMount: false` then skipped the stale check on the next mount).
- folded Addendum 3: each colour bucket is sorted by Quran order `(surah, verse, wordPos)` parsed server-side from `marked_id`/`verse_key`, not `page_number asc`.
- folded Addendum 4: the three stacked `<section>` colour groups became always-visible shadcn `Tabs`; default tab derived from the first non-empty bucket, whole-page empty state checked first.
- folded Addendum 5: within each tab, contiguous runs are grouped by surah with a `sticky top-0` divider (`dir` on the outer `<div>`).
