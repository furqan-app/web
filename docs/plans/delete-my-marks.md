# Delete My Marks

**Type:** feature
**Date:** 2026-07-03
**Status:** implemented (incl. Addendum)

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

## Addendum — hardening from `/review-fq-work` findings

Three "note"-severity findings from the code review of this feature's branch. All three are scoped narrowly (confirmed via codebase search — no other call sites affected beyond what's listed):

**1. Vestigial `page_number` on the delete path (`app/server/actions/deletePageMark.ts`, `app/api/quran/pages/[pageId]/marks/route.ts`)**

`page_number` is required in the URL only to match the `[pageId]` dynamic route segment — the `DELETE` handler doesn't read it, and the mark's Prisma unique key (`marked_type_marked_id_mark_type_to_user`) is page-independent, so this is correct behavior, just underdocumented in a way that could mislead a future reader into thinking delete is page-scoped.

**Fix:** add a one-line comment at both ends — no behavior change:
- `app/server/actions/deletePageMark.ts`: comment above the `page_number` destructure explaining it's only used to build the URL path (routing requirement), not sent in the body because the handler doesn't use it for scoping.
- `app/api/quran/pages/[pageId]/marks/route.ts`'s `DELETE`: comment noting the route's `pageId` param is intentionally unused — deletion is scoped by `to_user` + the compound mark key only, not by page.

**2. Silent failure on delete/add error (`app/components/MarkModal.tsx`)**

`markWord`/`removeMark` currently just no-op when `addPageMark`/`deletePageMark` return `false` (e.g. a 422 or network failure) — no user-facing feedback, only a `console.error` inside the action itself. There is no toast/notification system anywhere in the app today (confirmed via search).

**Fix — inline error text, scoped to `MarkModal`, no new dependency:**
- Add `const [error, setError] = useState(false)` in `MarkModal`.
- In `markWord` and `removeMark`, `setError(false)` at the start of the attempt (clear stale error) and `setError(true)` in the `else` branch when the action returns falsy (leave the modal open in that case, instead of the current do-nothing).
- Pass `error` down through `CategoryContentProps` to `BookmarksTab`; render a short message (`t("markModal.actionError", "Something went wrong. Try again.")`) in `text-xs text-destructive` beneath the Save/Remove buttons when `error` is true.
- Add `markModal.actionError` to `messages/en.json` ("Something went wrong. Try again.") and `messages/ar.json` ("حدث خطأ ما. حاول مرة أخرى.").

**3. `extractUser` throws raw 500 on malformed/missing header (`app/api/request.ts`, `app/api/quran/pages/[pageId]/marks/route.ts`)**

All three call sites (`GET`, `POST`, `DELETE` — confirmed the only call sites in the codebase) access `user.id` with no null check; `extractUser`'s `JSON.parse` throws uncaught if the `user` header is absent or malformed, surfacing as an unhandled 500 instead of a clean auth error.

**Fix:**
- `app/api/request.ts`: `extractUser` wraps `JSON.parse` in `try/catch`, returning `null` on failure instead of throwing.
- `app/api/quran/pages/[pageId]/marks/route.ts`: each of `GET`/`POST`/`DELETE` checks `if (!user) return jsonResponse({ code: 401, message: "Unauthorized" })` immediately after calling `extractUser`, before any other logic.

**Files to change:**
- `app/server/actions/deletePageMark.ts` — clarifying comment only.
- `app/api/quran/pages/[pageId]/marks/route.ts` — clarifying comment on `DELETE`; add `user` null-check + 401 to `GET`/`POST`/`DELETE`.
- `app/api/request.ts` — `extractUser` returns `null` instead of throwing on malformed/missing header.
- `app/components/MarkModal.tsx` — add `error` state, wire into `markWord`/`removeMark`, render inline error text in `BookmarksTab`.
- `messages/en.json`, `messages/ar.json` — add `markModal.actionError`.

**Constraints:**
- No new dependency (no toast library) — error feedback is scoped to `MarkModal`'s own inline text.
- No behavior change to the routing/URL structure for delete — `page_number` stays in the URL path, only comments are added.
- `extractUser`'s new `null` return must be checked at every call site in the same commit — do not leave any of `GET`/`POST`/`DELETE` still doing an unguarded `user.id` access.
- Do not add this 401 guard pattern to unrelated API routes in this pass — scope is this one route file, per the review finding.

**Decisions Made:**
- Chose inline error text over introducing a toast system — the app has no existing notification primitive, and adding one is a larger, separate decision outside the scope of hardening this one feature.
- Chose comments over restructuring the delete route (e.g. dropping `[pageId]` from the URL) — the dynamic route segment is a Next.js routing requirement, not a design flaw; documenting the intentional non-use of `pageId` for scoping is lower-risk than a route-shape change.
