# My Marks Page

**Type:** feature
**Date:** 2026-07-09
**Status:** implemented

Trello: [#40 A page to see my marks](https://trello.com/c/t9mODskH/40-a-page-to-see-my-marks)

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
   - Group into three buckets by `color` (`red`, `blue`, `green`); each bucket keeps the API's `page_number asc` order (no client-side re-sort needed).
   - Render one section per non-empty color bucket, in fixed order red → blue → green, header reusing `t("markModal.redMark")` / `blueMark` / `greenMark`.
   - If all buckets are empty, render an empty state (new `marks.empty` key).
   - Each row: color swatch (same `Bookmark` chip styling as `MarkerColorPicker`), `chapter_name_simple`/`chapter_name_arabic` (locale-aware, same ternary `SearchQueryResults` uses) + `toLocaleNumeral(verse_number, locale)`, snippet in `font-uthmanic` RTL, page number, wrapped in `Link href={`/pages/${page_number}`}` (hardcoded — self-marks only, no grant base path).
   - Remove button per row: icon button, `e.preventDefault()`/`stopPropagation()` (row is a `Link`), calls existing `deletePageMark({ page_number, marked_type, marked_id, mark_type: "color" })` from `app/server/actions/deletePageMark.ts` (already handles this shape — no changes needed there), then `reload()` on success.

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

Grouping: bucket all rows by `color` into `red`/`blue`/`green`; render in that fixed order; each bucket already sorted `page_number asc` from the API query; skip empty buckets; empty-state if all three are empty.

Removal: existing `deletePageMark` action, unchanged — every row already carries the exact fields it needs (`page_number`, `marked_type`, `marked_id`, `mark_type: "color"`).

## Verified Test Cases

1. **Word mark**, `location: "2:255:5"`, `mark_value: "red"`, `page_number: 42` → row: red swatch, "Al-Baqarah · ٢٥٥" (or "Al-Baqarah · 255" in `en`), snippet = the single word's `qpc_uthmani_hafs`, links to `/pages/42`.
2. **Verse mark**, `verse_key: "18:10"`, `mark_value: "blue"`, `page_number: 296` → row: blue swatch, "Al-Kahf · ١٠", snippet = that verse's words joined (≤20 words, else truncated + "..."), links to `/pages/296`.
3. **No marks at all** → signed-in user sees the empty state, no color sections rendered.
4. **Only red marks exist** → only the Red section renders; Blue/Green sections are omitted entirely (not rendered empty).
5. **Signed out** → `MarksSignedOutPrompt`, no data fetch attempted (server component branches before rendering `MyMarksList`).

## Files to Change

- `app/api/marks/route.ts` — new, `GET` only, self-only enriched marks list
- `app/middlewares/auth-middleware.ts` — add `/api/marks` to `protectedRoutes`
- `app/server/actions/getAllMarks.ts` — new, mirrors `getPageMarks.ts`
- `app/hooks/use-all-marks.ts` — new, mirrors `use-marks.ts`
- `app/[locale]/marks/page.tsx` — new route, mirrors `app/[locale]/mushaf/page.tsx`'s session-branch shape
- `app/components/marks/MarksSignedOutPrompt.tsx` — new, own copy (not a reuse of the mushaf one)
- `app/components/marks/MyMarksList.tsx` — new, grouped list + remove action
- `app/components/nav/MarksLink.tsx` — new, mirrors `SharedMushafLink.tsx`
- `app/components/nav/Nav.tsx` — add `<MarksLink />` next to `<SharedMushafLink />`
- `messages/en.json`, `messages/ar.json` — add `marks.*` keys

## Constraints

- Self-marks only — do not add grant/`grantId` awareness to any new file in this pass (no `basePath` threading, no `/mushaf/[grant]/marks`).
- `mark_type: "color"` only — do not attempt to branch on or render `note`-type marks; that mark type has no write path yet anywhere in the app.
- Do not add a new DELETE endpoint — reuse `deletePageMark`/the existing `DELETE` handler on `app/api/quran/pages/[pageId]/marks/route.ts` as-is.
- Do not use `verse.text_uthmani` for the verse-mark snippet — always join `word.qpc_uthmani_hafs` per the Font System encoding contract in `DECISIONS.md`.
- Do not duplicate `markModal.redMark`/`greenMark`/`blueMark`/`removeMark` translation keys — reuse them.
- Do not reuse `mushaf/SignedOutPrompt.tsx` as-is — its copy is mushaf-specific; this page gets its own signed-out component with its own message.

## What NOT to Do

- None known — this is a new, additive feature with no prior superseded approach. (The earlier `delete-my-marks.md` plan explicitly scoped "no new route/page for viewing all marks" out of *that* task; this plan is the intentional follow-up that now builds it, not a re-proposal of something already reverted.)

## Decisions Made

- Self-marks only, no shared-mushaf/grant viewing in this pass.
- Color marks only (`mark_type: "color"`); notes stay out of scope.
- Entry point: always-visible Nav bar icon+label link, same pattern as `SharedMushafLink`.
- Grouped by color (red → blue → green), mushaf order (`page_number asc`) within each group.
- Word-mark rows show only the single marked word as the snippet (no wider verse context).
- Remove action lives directly on each row, reusing the existing `deletePageMark` action — no new delete endpoint.
