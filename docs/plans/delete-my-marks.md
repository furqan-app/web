# Delete My Marks

**Type:** feature
**Date:** 2026-07-03
**Status:** implemented

## Summary

Users can currently add a bookmark-color mark to a word or verse (via `MarkModal` → `MarkerColorPicker`), but there is no way to remove one — once set, a marked word/verse stays highlighted forever. This adds the ability to remove an existing mark, in place, from the same modal used to add one. No new page or route is introduced; scope is limited to the existing per-page mark modal.

Trello: [#43 Delete my marks](https://trello.com/c/y22VYd4M/43-delete-my-marks)

## Approach

1. **API — add `DELETE`** to `app/api/quran/pages/[pageId]/marks/route.ts`, alongside the existing `GET`/`POST`. It reads `{ marked_type, marked_id, mark_type }` from the request body (same shape as `POST`, minus `mark_value`), validates required fields (`422` on missing), and runs `appPrisma.mark.deleteMany({ where: { to_user: user.id, marked_type, marked_id, mark_type } })` — scoped to `to_user` so a user can only delete their own marks, using `deleteMany` (not `delete`) so a missing mark is a no-op rather than a Prisma "not found" throw.

2. **Server action — `app/server/actions/deletePageMark.ts`**, mirroring `addPageMark.ts`: takes `{ page_number, marked_type, marked_id, mark_type }`, `fetch`s `DELETE /api/quran/pages/${page_number}/marks` with a JSON body, returns `true`/`false` on `response.success`.

3. **Surface the existing mark to `MarkModal`.** `QuranSafha` already holds `marks` (from `useMarks(page)`, keyed by `marked_id` = word `location` or verse `verse_key`) but doesn't pass it to `MarkModal`. Add a `currentColor?: string` prop to `MarkModal`, computed in `QuranSafha` the same way `QuranWord` already does it (`marks[markedId]?.find(m => m.name === "color")?.value`), where `markedId` is `isWord ? word.location : verse.verse_key`.

4. **`MarkModal` UI:** in the `bookmarks` tab content, keep `MarkerColorPicker` as-is (switching color still upserts, matching existing behavior) and add a "Remove mark" button below it, rendered only when `currentColor` is set. Clicking it calls `deletePageMark` with the same `marked_type`/`marked_id`/`mark_type: "color"` used for adding, then (on success) calls `reloadMarks()` and `close()` — same immediate, no-confirmation pattern as picking a color.

5. **Translations:** add `markModal.removeMark` to `messages/en.json` ("Remove Mark") and `messages/ar.json` ("إزالة العلامة").

## Files to Change

- `app/api/quran/pages/[pageId]/marks/route.ts` — add `DELETE` handler
- `app/server/actions/deletePageMark.ts` — new file, mirrors `addPageMark.ts`
- `app/components/MarkModal.tsx` — accept `currentColor` prop, add conditional "Remove mark" button, wire to `deletePageMark`
- `app/components/QuranSafha.tsx` — compute and pass `currentColor` into `MarkModal`
- `messages/en.json`, `messages/ar.json` — add `markModal.removeMark`

## Constraints

- Do not add a confirmation dialog — removal is immediate, consistent with how adding a color is immediate.
- Do not touch the `notes` tab — it's explicitly "Under development" and out of scope.
- `DELETE` must scope by `to_user: user.id` (not just the compound unique key) so the auth boundary matches `GET`/`POST`.
- No new route/page for viewing all marks — deletion happens only in-place via the word/verse a user already clicks to mark it (per this task's agreed scope).

## Decisions Made

- Delete entry point: in-place on the already-marked word/verse (not a new "My Marks" list page).
- Modal keeps the color picker (to allow one-click color switching) plus a separate "Remove mark" button, rather than hiding the picker once a mark exists.
- No confirmation step before deleting.
