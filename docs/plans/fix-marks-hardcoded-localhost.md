# Fix Marks Broken by Hardcoded localhost URL

**Type:** bug  
**Date:** 2026-07-03  
**Status:** implemented

## Root Cause

`addPageMark.ts` and `getPageMarks.ts` hardcode `http://localhost:3000` as the fetch base URL. These run client-side (no `"use server"`, called from React Query hooks). On Hostinger, `localhost:3000` resolves to the user's machine → connection refused → catch swallows the error → silent failure.

## Fix

Replace absolute URLs with relative paths:
- `app/server/actions/addPageMark.ts` — `/api/quran/pages/${data.page_number}/marks`
- `app/server/actions/getPageMarks.ts` — `/api/quran/pages/${page}/marks`

## Constraints

- Do not use `NEXT_PUBLIC_BASE_URL` — relative paths are correct for client-side fetch.
- Do not add `"use server"` — that would require an absolute URL, reintroducing the problem.
