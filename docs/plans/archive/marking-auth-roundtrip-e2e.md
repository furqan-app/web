---
title: "Complex E2E & Fix: Word Marking, Auth Gates & 'My Marks' Round-Trip Jumps"
type: feature
date: 2026-09-02
status: implemented
area: marks
---

# Complex E2E & Fix: Word Marking, Auth Gates & 'My Marks' Round-Trip Jumps

**GitHub Issue:** [#468](https://github.com/furqan-app/web/issues/468)
**Parent Epic:** [#466](https://github.com/furqan-app/web/issues/466)

## Summary

Fix the auth redirect flow so a signed-out user who taps a word → signs in via Google OAuth → returns to the exact reader page with the mark modal pre-opened on the same word. Then write Playwright E2E tests covering three cross-page round-trip flows: (1) auth gate → sign in → modal restoration, (2) reader → `/marks` → reader with mark visible, (3) delete from `/marks` → reader with mark gone (no stale cache).

## Approach

Two parts: a small product fix (auth redirect word restoration) and a new E2E test file.

### Part 1 — Auth redirect word restoration

Currently, `MarkModal`'s sign-in button calls `signIn()` with no args. After OAuth, the user returns to the same page but the tapped-word state (React `useState` in `QuranSafha`) is lost — the modal doesn't reopen.

**Fix:** Encode the word/verse identifier in the OAuth callback URL, then restore it on the reader page.

### Part 2 — E2E tests

Three new `test.describe` blocks in `e2e/tests/word-marking.spec.ts` (extending the existing file, not a new spec).

## Decision Tree / Algorithm

### Auth redirect restoration

| User state | Action | System behavior |
|---|---|---|
| Signed out, taps word | MarkModal opens with "Sign in" prompt | — |
| Clicks "Sign in" | `signIn("google", { callbackUrl })` | `callbackUrl` = current pathname + `?markWord=<id>` where `<id>` = `word.location` (word) or `verse_key` (verse end marker) |
| Returns from OAuth | Page loads at `/pages/[id]?markWord=1:1:1` | `QuranSafha` reads `markWord` param on mount/content-load |
| Content loaded, param present | Find word in `lines` by location | If `markWord` has 3 segments (`s:v:w`) → word lookup by `location`; if 2 segments (`s:v`) → verse lookup by `verse_key` |
| Word found | Call `selectWord(word)` → modal opens | Clear `markWord` param via `history.replaceState` |
| Word not found (wrong page, edge) | Skip silently | Clear param anyway to avoid infinite retry |

### Segment-count word vs verse detection

```
markWord param value → split by ":"
  3 segments (e.g. "1:1:1") → word location → find word where w.location === param
  2 segments (e.g. "1:1")   → verse_key → find any word where w.verse_key === param, use its verse
```

### E2E test flows

| Flow | Setup | Actions | Assertions |
|---|---|---|---|
| **Auth restore** | Signed out, desktop, `/ar/pages/1` | Click word `1:1:1` → click "Sign in" in modal → simulate auth (set cookie) → reload with `?markWord=1:1:1` | MarkModal opens automatically with word title visible; `markWord` param cleared from URL |
| **Reader → /marks → Reader** | Authenticated, mark word `1:1:1` as `forgetting` | Navigate to `/ar/marks` → verify mark row → click row link | Reader loads at `/ar/pages/1`, word `1:1:1` has `bg-red-400` class |
| **Delete from /marks → Reader fresh** | Authenticated, mark word `1:1:1` as `forgetting` | Navigate to `/ar/marks` → delete mark via trash button → navigate to `/ar/pages/1` | Word `1:1:1` has NO `bg-red-400` class (React Query cache was invalidated) |

## Verified Test Cases

1. **Auth redirect restore (word):**
   - Signed out → `/ar/pages/1` → click `[data-fq-word="1:1:1"]` → modal opens with "Sign in" prompt.
   - Set auth cookie → navigate to `/ar/pages/1?markWord=1:1:1`.
   - Assert: dialog opens with word title "بِسْمِ", URL no longer has `markWord` param.
   - Assert: authenticated marks UI is visible (category picker, save button).

2. **Auth redirect restore (verse):**
   - Same flow but click `.fq-ayah-end` first → `markWord=1:1` (2 segments).
   - Assert: dialog opens with "تحديد آية" header.

3. **Reader → /marks → Reader highlight intact:**
   - Mark `1:1:1` as `forgetting` → go to `/ar/marks` → verify row exists → click row link.
   - Assert: navigates to `/ar/pages/1`, `[data-fq-word="1:1:1"]` has `bg-red-400`.

4. **Delete from /marks → Reader cache fresh:**
   - Mark `1:1:1` as `forgetting` → go to `/ar/marks` → click trash → verify empty state.
   - Navigate to `/ar/pages/1`.
   - Assert: `[data-fq-word="1:1:1"]` does NOT have `bg-red-400`.

## Files to Change

### Fix — auth redirect word restoration

- `app/components/MarkModal.tsx` — change `signIn()` call to `signIn("google", { callbackUrl: pathname + "?markWord=" + markId })`, using the `markFor` prop to derive the id (`"location" in markFor ? markFor.location : markFor.verse_key`). Need `usePathname()` from `next/navigation`.
- `app/components/QuranSafha.tsx` — add a `useEffect` that reads the `markWord` search param (via `useSearchParams()`), looks up the word/verse in the loaded `lines`, calls `selectWord()`, and clears the param with `history.replaceState`. The effect should depend on `lines` being populated (so it fires after content loads) and only run once per param value.

### E2E tests

- `e2e/tests/word-marking.spec.ts` — add three new `test.describe` blocks:
  - "Auth Gate Redirect Restoration" — tests word and verse param restore
  - "Reader to My Marks Round-Trip" — tests mark visibility after navigation from `/marks`
  - "My Marks Deletion Cache Freshness" — tests mark removal reflects immediately in reader

## Constraints

- The `?markWord` param is **not** the same as `?highlight`. `highlight` is for temporary verse-level visual highlighting (search results, ayah picker). `markWord` is for restoring the MarkModal's selected-word state after an auth redirect. They serve different purposes and should not be merged.
- `markWord` must be cleared from the URL immediately after use — it is a one-shot restore signal, not persistent state. The pager's `replaceState` on swipe would strip it anyway, but explicit cleanup avoids the modal reopening on a manual reload before a swipe.
- The E2E auth redirect test cannot go through real Google OAuth. Instead, it simulates the post-OAuth state: set the auth cookie (existing `authenticateAsUser` helper), then navigate to the page with the `?markWord` param. This tests the restoration mechanism, not the OAuth flow.
- Do not make the reader page route dynamic — it stays statically generated. The `markWord` param is read client-side via `useSearchParams()`.
- Cross-domain DB isolation holds: marks reference Quran data by scalar id only (ADR 0008).
- React Query cache invalidation relies on the existing `/marks` prefix pattern (both `useMarks` and `useAllMarks` share it). No changes to the invalidation mechanism — just testing it.
- The `selectWord` callback in `QuranSafha` requires the full `WordWithVerse` object. The `markWord` param only carries the location string, so the effect must find the matching word in the `lines` data. If content hasn't loaded yet (`lines` is empty), the effect is a no-op; it re-runs when `lines` changes. Once it matches and selects, it sets a ref flag to prevent re-triggering.
- The `signIn("google", { callbackUrl })` call requires a full URL or pathname — `next-auth` resolves it relative to `NEXTAUTH_URL`. Passing `pathname + "?markWord=..."` works because next-auth treats a relative path as same-origin.

## What NOT to Do

- Do not merge `markWord` with `highlight` — they serve different purposes (modal restoration vs verse visual highlight).
- Do not make `markWord` survive swipe navigation — it is a one-shot signal, cleared immediately.
- Do not test real Google OAuth in E2E — simulate the post-auth state with cookie injection.
- Do not change the React Query invalidation mechanism — it already works; this task only tests it.
- Do not add `searchParams` to the server component (`page.tsx`) — that would make the route dynamic.
- Do not add a second `useSearchParams()` call in `QuranSafha` if one is already present (check first — `QuranWord` reads it, but `QuranSafha` may not). If needed, pass through or read at the right level.

## Decisions Made

- `markWord` as the URL param name (not `mark`, `word`, or reusing `highlight`) — clear, specific, no collision.
- Segment-count heuristic for word (3) vs verse (2) — simple, unambiguous within the Quran's `s:v:w` / `s:v` convention.
- E2E auth test simulates post-OAuth by injecting cookie + navigating with param, not by mocking the OAuth flow — pragmatic and tests the actual restoration code.
- Mark visibility after `/marks` → reader navigation is verified by the existing category highlight class, not by adding a new temporary highlight — the category highlight IS the highlight.
