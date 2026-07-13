# Delete My Marks

**Type:** feature  
**Date:** 2026-07-03  
**Status:** implemented (incl. Addendum)

Trello: [#43](https://trello.com/c/y22VYd4M/43-delete-my-marks)

## Summary

Add ability to remove an existing mark from the same `MarkModal` used to add one. No new page or route. Includes hardening from `/review-fq-work`: `extractUser` null safety, inline error feedback, and clarifying comments on the vestigial `page_number` in the delete path.

## Approach

1. **`DELETE` handler** in `app/api/quran/pages/[pageId]/marks/route.ts`: reads `{ marked_type, marked_id, mark_type }` from request body (same shape as `POST`, minus `mark_value`); `appPrisma.mark.deleteMany({ where: { to_user: user.id, marked_type, marked_id, mark_type } })` — scoped to `to_user`, `deleteMany` so missing mark is a no-op. The route's `pageId` param is intentionally unused for scoping (comment explaining this).

2. **`app/server/actions/deletePageMark.ts`** — mirrors `addPageMark.ts`: `fetch DELETE /api/quran/pages/${page_number}/marks` with JSON body, returns `true`/`false`. `page_number` is only for the URL path (routing requirement), not sent in body (comment explaining this).

3. **Surface `currentColor` to `MarkModal`**: `QuranSafha` computes `marks[markedId]?.find(m => m.name === "color")?.value` (same lookup `QuranWord` already does) and passes it as `currentColor?: string` prop to `MarkModal`.

4. **`MarkModal` UI**: "Remove mark" button in `bookmarks` tab, shown only when `currentColor` is set. On click: calls `deletePageMark`, then `reloadMarks()` + `close()`. No confirmation dialog — matches the immediate pattern of adding a color.

5. **Error state**: `useState(false)` in `MarkModal`; `setError(false)` at start of `markWord`/`removeMark`, `setError(true)` on falsy return; renders `t("markModal.actionError")` in `text-xs text-destructive` beneath Save/Remove buttons. No toast system — inline only.

6. **`extractUser` null safety** (`app/api/request.ts`): wraps `JSON.parse` in `try/catch`, returns `null` on failure. All three handlers (`GET`/`POST`/`DELETE`) check `if (!user) return jsonResponse({ code: 401, message: "Unauthorized" })` before any logic.

## Files Changed

- `app/api/quran/pages/[pageId]/marks/route.ts` — add `DELETE`; `extractUser` null-check + 401 on all three handlers
- `app/api/request.ts` — `extractUser` returns `null` instead of throwing
- `app/server/actions/deletePageMark.ts` — new
- `app/components/MarkModal.tsx` — `currentColor` prop, "Remove mark" button, `error` state
- `app/components/QuranSafha.tsx` — compute + pass `currentColor`
- `messages/en.json`, `messages/ar.json` — `markModal.removeMark`, `markModal.actionError`

## Constraints

- `DELETE` must scope by `to_user` — not just the compound mark key.
- No confirmation dialog.
- `extractUser` null check must cover `GET`/`POST`/`DELETE` in the same commit — no unguarded `user.id` access.
- Do not apply the 401 guard to unrelated API routes in this pass.
- No toast library — error feedback is inline only.
