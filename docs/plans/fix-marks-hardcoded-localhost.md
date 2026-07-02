# Fix Marks Broken by Hardcoded localhost URL

**Type:** bug  
**Date:** 2026-07-03  
**Status:** implemented

## Summary

Marking a word or verse on Hostinger silently does nothing. `addPageMark` and `getPageMarks` both hardcode `http://localhost:3000` as the base URL for their internal API fetches. These functions are called from client-side React Query hooks — they run in the user's browser, where `localhost:3000` resolves to the user's own machine, not Hostinger. The fetch fails (connection refused), the catch block swallows the error, and the UI shows no feedback.

## Root Cause

`app/server/actions/addPageMark.ts:14` and `app/server/actions/getPageMarks.ts:11` both construct absolute URLs with `http://localhost:3000/api/quran/pages/...`. These functions are not Next.js Server Actions — they have no `"use server"` directive and are called from `useQuery`/event handlers, meaning they execute exclusively in the browser. In the browser, relative paths resolve correctly against the current origin; `http://localhost:3000` does not.

## Files to Change

- `app/server/actions/addPageMark.ts` — replace `http://localhost:3000/api/quran/pages/${data.page_number}/marks` with `/api/quran/pages/${data.page_number}/marks`
- `app/server/actions/getPageMarks.ts` — replace `http://localhost:3000/api/quran/pages/${page}/marks` with `/api/quran/pages/${page}/marks`

## Constraints

- Do not use `NEXT_PUBLIC_BASE_URL` here — relative paths are simpler, have no env var dependency, and are correct since these functions only ever run client-side.
- Do not add `"use server"` to these files to make them real Server Actions — server-side fetch calls need an absolute URL, which reintroduces the problem. Keep them as plain client-side async functions.
- No changes needed to the API route, middleware, or auth flow.

## Decisions Made

- Relative paths are the correct fix for client-side fetch calls in this codebase. The `app/server/actions/` directory name is misleading — these are client-side helpers, not Next.js Server Actions.
