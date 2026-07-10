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

## Addendum — cache invalidation bug (stale list after add/remove elsewhere)

**Bug:** Adding or removing a mark anywhere else in the app (the reader's `MarkModal`) doesn't refresh the `/marks` page's list, and vice versa — removing from `/marks` doesn't refresh a previously-cached reader page. Users had to hard-refresh to see current data.

**Root cause:** Two independent React Query cache entries for the same underlying `Mark` rows, with no invalidation link between them:
- `useMarks(page, grantId)` (`app/hooks/use-marks.ts`) — key `["/marks", page, grantId ?? "self"]`, reloaded by `MarkModal`'s `markWord`/`removeMark` (`app/components/MarkModal.tsx`).
- `useAllMarks()` (`app/hooks/use-all-marks.ts`) — key `["/marks/all"]`, reloaded by `MyMarksList`'s own remove handler only.

Each `reload()` only invalidates its own narrow key, so a mutation made through one hook never marks the other's cache stale.

**Fix:** Nest both query keys under the same `"/marks"` prefix and broaden both `reload()` implementations to invalidate that whole prefix, relying on React Query's default partial/prefix key matching:
- `app/hooks/use-all-marks.ts`: change `queryKey` from `["/marks/all"]` to `["/marks", "all"]`.
- `app/hooks/use-marks.ts`: change `reload` from `queryClient.invalidateQueries({ queryKey })` (the exact per-page key) to `queryClient.invalidateQueries({ queryKey: ["/marks"] })`.
- `app/hooks/use-all-marks.ts`: change `reload` the same way — `queryClient.invalidateQueries({ queryKey: ["/marks"] })`.

Both hooks now invalidate every marks-related query app-wide (any page, any grant, and the all-marks list) on any mutation, regardless of which hook triggered it. Over-invalidation (e.g. a grant-viewer's edit also marking the unrelated self `/marks` list stale) is accepted — inactive queries are just marked stale, not eagerly refetched, so the only cost is a refetch next time that view is actually visited.

**Files to Change (addendum):**
- `app/hooks/use-marks.ts` — broaden `reload`'s invalidation to the `["/marks"]` prefix
- `app/hooks/use-all-marks.ts` — nest `queryKey` under `["/marks", "all"]`; broaden `reload`'s invalidation to the `["/marks"]` prefix

**Constraints (addendum):**
- Do not give the two hooks separate, unlinked query-key namespaces again — the whole point of this fix is a shared `"/marks"` prefix so one `reload()` call reaches both.
- Do not add manual cross-hook invalidation calls (e.g. `MarkModal` importing `useAllMarks` just to call its `reload`) — the shared-prefix approach make that unnecessary and keeps the hooks decoupled.

**What NOT to Do (addendum):**
- Do not solve this with `refetchOnWindowFocus`/polling — the existing hooks deliberately disable those (marks only change via explicit user action); a shared invalidation key is the correct fix, not a broader refetch policy.

## Addendum 2 — refetchOnMount was still blocking the fix

**Bug (still present after Addendum 1):** Adding a mark in the reader still didn't show up on `/marks` without a manual refresh, even though `reload()` now invalidates the shared `["/marks"]` prefix.

**Root cause:** Both hooks set `refetchOnMount: false`. `invalidateQueries` only force-refetches queries that currently have an **active observer** (a mounted `useQuery`). When you add a mark from a reader page, `/marks` isn't mounted — its query is marked stale but not refetched. Then navigating to `/marks` mounts a *new* observer; a mount normally checks "is this stale? if so, refetch," but `refetchOnMount: false` skips that check unconditionally, so it renders the last cached (pre-mutation) snapshot regardless of the stale flag. This is a `Next.js` App Router fetch/router-cache red herring, ruled out: `/api/marks`'s `GET` handler takes a `NextRequest` param, which makes it dynamic (never in the Full Route Cache), and the client fetch happens inside a `"use client"` component after hydration — plain browser `fetch`, not subject to Next's server-side fetch caching. The staleness is entirely in React Query's client cache.

**Fix:** The hooks used `refetchOnMount: false` to avoid refetching on every ordinary navigation, relying on the default `staleTime: 0` (data is "stale" immediately, so `refetchOnMount: true` would refetch almost every mount). The correct combination for "only refetch when explicitly invalidated" is `staleTime: Infinity` (data never goes stale on its own) plus `refetchOnMount: true`, i.e. the React Query default — remove the `refetchOnMount: false` override and add `staleTime: Infinity`. This preserves "no refetch on ordinary re-navigation" (nothing is stale) while guaranteeing a refetch the next time a query mounts after `invalidateQueries` marked it stale, active or not at invalidation time.

**Files to Change (addendum 2):**
- `app/hooks/use-marks.ts` — replace `refetchOnMount: false` with `staleTime: Infinity` (default `refetchOnMount: true` applies)
- `app/hooks/use-all-marks.ts` — same change

**Constraints (addendum 2):**
- Keep `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `refetchInterval: false`, `refetchIntervalInBackground: false` — unrelated to this bug, still desired (marks don't need to refetch on focus/reconnect/polling, only on explicit invalidation).

**What NOT to Do (addendum 2):**
- Do not set `refetchOnMount: "always"` — that would refetch on every mount regardless of staleness, reintroducing needless requests on ordinary navigation; `staleTime: Infinity` + default `refetchOnMount: true` is the precise fix (refetch only when actually invalidated).

## Addendum 3 — sort within each color group by Quran order, not page_number

**Request:** Within each color bucket on `/marks`, marks should be ordered by correct Quran reading order (surah → ayah → word), not just `page_number asc`. A page can span a partial surah/multiple surahs and contain several verses, so `page_number` alone doesn't guarantee correct in-page ordering.

**Approach:** `marked_id` already encodes everything needed — no new DB fields required:
- Word mark: `marked_id` is `location`, format `"surah:verse:word"` (e.g. `"2:255:5"`).
- Verse mark: `marked_id` is `verse_key`, format `"surah:verse"` (e.g. `"18:10"`).

**Decision Tree / Algorithm (verified):**

| marked_type | Parsed from | Sort key `(surah, verse, wordPos)` |
|---|---|---|
| `word` | `location` = `"s:v:w"` | `(s, v, w)` |
| `verse` | `verse_key` = `"s:v"` | `(s, v, Infinity)` — a verse mark is triggered by tapping the end-of-verse glyph, so it conceptually sits after every word of that verse |

Sort each color bucket ascending by this tuple, replacing the current `page_number asc` ordering (which only ever came from the DB query's `orderBy`, not an explicit sort applied to the list).

**Verified Test Case:** a red bucket with, in this input order: word `"2:255:5"`, verse `"2:255"`, word `"2:255:2"`, word `"18:10:1"` → sorts to `2:255:2` → `2:255:5` → `2:255` (verse mark) → `18:10:1`. Confirmed correct with the user.

**Where to sort:** either in `app/api/marks/route.ts` (server-side, before returning `items`) or client-side in `MyMarksList.tsx` when building `buckets`. Server-side is preferred — keeps `MyMarksList` a pure render of already-ordered data, consistent with how the API already fully owns shaping (chapter names, snippet truncation).

**Files to Change (addendum 3):**
- `app/api/marks/route.ts` — parse `(surah, verse, wordPos)` from `marked_id` per the table above, sort `items` by that tuple before returning (in addition to / instead of the existing `orderBy: { page_number: "asc" }` on the Prisma query, which becomes redundant once the explicit sort runs — the Prisma `orderBy` can stay as a harmless pre-sort or be removed, since the final `Array.sort` fully determines order)

**Constraints (addendum 3):**
- Sort key must be parsed from `marked_id`/`verse_key`, not derived from `page_number` — page number is not a reliable proxy for surah/ayah/word order.
- Grouping by color (red → blue → green, per the original plan) is unchanged — this only changes ordering *within* each color bucket.

**What NOT to Do (addendum 3):**
- Do not add new columns/joins to fetch a numeric surah id for sorting — `marked_id`'s embedded surah number (first colon-segment) is already authoritative and cheaper than an extra lookup.

## Addendum 4 — tab groups for colors instead of stacked sections

**Request:** Replace the three stacked `<section>` color groups in `MyMarksList` with a tabbed layout — one tab per color, showing only the selected color's marks at a time, instead of all three sections rendered together.

**Approach:** Reuse the existing shadcn `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` primitives (`components/ui/tabs.tsx`), already used the same way in `MarkModal.tsx` for its Bookmarks/Notes tabs — no new UI primitive needed.

**Decisions confirmed with user:**
1. **All three tabs always render**, in fixed order Red → Blue → Green, regardless of whether a color has any marks. Selecting an empty color's tab shows a small "no marks in this color" message inside that tab's content (reusing/adapting the existing `marks.empty` copy, scoped per-color rather than the whole-page empty state).
2. **Default active tab is always Red** (`Tabs defaultValue="red"`), regardless of which colors actually have marks.
3. The whole-page empty state (all three colors empty) is unchanged — still shown instead of the tabs when there are zero marks total.

**Files to Change (addendum 4):**
- `app/components/marks/MyMarksList.tsx` — replace the `buckets.filter(...).map(...)` stacked-`<section>` rendering with `Tabs`/`TabsList` (one `TabsTrigger` per `MARK_COLORS` entry, always rendered) + `TabsContent` per color (rendering that color's rows, or a small empty message if none)
- `messages/en.json` / `messages/ar.json` — add a per-color-empty translation key (e.g. `marks.emptyColor`, "No marks in this color yet." / "لا توجد علامات بهذا اللون بعد.")

**Constraints (addendum 4):**
- Keep the existing row markup/remove-button behavior exactly as-is (Addendum before this one already fixed its HTML nesting and error handling) — this addendum only changes the outer grouping structure, not row internals.
- The whole-page empty state (zero marks across all colors) stays a separate, higher-priority check before rendering tabs at all — do not replace it with "just show empty red tab," since that would still render Blue/Green tabs pointing at data known to be entirely empty.
- Tab triggers use `MARK_COLORS`' existing `chip`/`labelKey`/`defaultLabel` — do not introduce a second color-label source.

**What NOT to Do (addendum 4):**
- Do not persist the selected tab across visits (e.g. localStorage) — out of scope; always defaults to Red per the confirmed decision.
- Do not hide empty-color tabs — confirmed decision is to always show all three.

## Addendum 5 — group by surah with a divider, inside each color tab

**Request:** Within each color tab's list (Addendum 4), group consecutive marks by surah and render a visual divider between surah groups.

**Approach:** `bucket.items` is already globally sorted by `(surah, verse, wordPos)` per Addendum 3, so surah groups are always contiguous runs — no re-sorting needed, just a linear scan that starts a new group whenever `chapter_name_simple` changes from the previous item (locale-independent, stable key; the locale-aware name is picked for display the same way rows already do it).

**Decision Tree / Algorithm:**
1. Walk `bucket.items` in order (already sorted).
2. Start a new group when `item.chapter_name_simple !== previous.chapter_name_simple` (or it's the first item).
3. Render, per group: a sticky divider bar (surah name, locale-aware — same `locale === "ar" ? chapter_name_arabic : chapter_name_simple` ternary already used per-row), then that group's rows using the existing unchanged row markup.

**Divider style (confirmed with user):** same visual language as `RubList.tsx`'s sticky Juz header — `sticky top-0 z-10 bg-muted border-y border-border`, bold surah name label — but **sticky**, unlike the non-sticky option. Confirmed safe: `Nav` (`app/components/nav/Nav.tsx`, rendered from `app/[locale]/layout.tsx`) has no `fixed`/`sticky` class, so it scrolls away with the page — a plain `sticky top-0` divider needs no extra top-offset to clear a fixed nav (unlike `Sidebar.tsx`'s `top-14`, which only applies inside its own `Sheet` overlay).

**Files to Change (addendum 5):**
- `app/components/marks/MyMarksList.tsx` — add a `groupBySurah(items)` helper (returns `Array<{ chapterNameSimple, chapterNameArabic, items }>`), call it per-bucket inside each color's `TabsContent`, render a sticky divider before each group's rows

**Constraints (addendum 5):**
- Do not re-sort `bucket.items` for this — Addendum 3's `(surah, verse, wordPos)` order already guarantees surah groups are contiguous; grouping is a pure linear scan.
- Row markup inside a group is unchanged from Addendum 4.
- The per-color empty state (`marks.emptyColor`, Addendum 4) is checked before grouping — an empty bucket never reaches the grouping step.

**What NOT to Do (addendum 5):**
- Do not add a surah number/page badge to the divider — confirmed scope is the surah name only, matching the "muted bar" precedent's label but without RubList's extra page-number subtitle (that pattern's Juz+Page pairing isn't part of this request).

## Addendum 6 — explicit dir on the surah divider's name

**Bug:** The surah divider's name span has no explicit `dir`, unlike other Arabic-bearing elements in this codebase (e.g. `MarkModal`'s title), which set it explicitly rather than relying on ambient inheritance.

**Fix (confirmed with user — divider only, not the per-row chapter-name line):** `dir={locale === "ar" ? "rtl" : "ltr"}` on the divider's **outer `<div>`** (the block container), not the inner text span — an inline `dir` on the span alone didn't fix the block's own alignment (confirmed broken via screenshot: text stayed left-anchored). Matches `RubList.tsx`'s working sticky-Juz-header precedent, which also sets `dir` on its outer div, not inner text.

**Files to Change (addendum 6):**
- `app/components/marks/MyMarksList.tsx` — `dir={locale === "ar" ? "rtl" : "ltr"}` on the divider's outer `<div>`

**What NOT to Do (addendum 6):**
- Do not touch the per-row chapter-name line — confirmed out of scope for this addendum.
