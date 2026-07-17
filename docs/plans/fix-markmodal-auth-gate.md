# Fix MarkModal Auth Gate — Allow Recitation Without Sign-in

**Type:** bug  
**Date:** 2026-07-14  
**Status:** implemented

## Summary

Tapping a word or verse while unauthenticated opens `SignInModal` instead of `MarkModal`. This blocks access to "Play from here" and word pronunciation — both of which require no auth. The fix removes the pre-modal auth branch in `QuranSafha`, always opens `MarkModal`, and moves the auth check inside the modal: authenticated users see the full marks UI; unauthenticated users see the recitation controls (unchanged) plus an inline sign-in prompt in place of the marks section.

## Root Cause

`QuranSafha.tsx` lines 239–260 branch on `session.data.user` before any modal is rendered:

```
session.data.user && selectedForMark → MarkModal
!session.data.user && selectedForMark → SignInModal
```

`SignInModal` has no recitation or audio controls, so unauthenticated users lose access to those features entirely.

## Fix

### Decision Tree

| Auth state | What renders |
|---|---|
| Authenticated | `MarkModal` with full marks UI (unchanged from current behavior) |
| Unauthenticated | `MarkModal` with recitation controls + inline sign-in prompt in place of marks section |

### Changes

**`QuranSafha.tsx`**
- Remove both conditional branches (lines 239–260).
- Replace with a single: `{selectedForMark ? <MarkModal ... /> : null}`.
- Remove the `SignInModal` import from this file (it is no longer opened from here).

**`MarkModal.tsx`**
- Add `useSession()` call at the top of the component.
- Derive `isAuthenticated = !!session.data?.user`.
- In the JSX, replace the `bg-muted` marks section with a conditional:
  - When `isAuthenticated`: render the existing marks section unchanged.
  - When `!isAuthenticated`: render a compact sign-in prompt (see design below).

**Sign-in prompt design (unauthenticated state):**
```
<div className="rounded-xl bg-muted border border-border/60 p-2.5 flex flex-col items-center gap-3">
  <p className="text-sm text-muted-foreground text-center">
    {t("markModal.signInToMark", "Sign in to mark words and verses")}
  </p>
  <Button
    className="bg-green-700 hover:bg-green-600 text-white"
    onClick={() => signIn()}
  >
    {t("signIn", "Sign in")}   {/* key already exists in ar.json */}
  </Button>
</div>
```

The `signIn` key already exists in `ar.json` (value: `"تسجيل الدخول"`). Only `markModal.signInToMark` is new.

**`messages/en.json`** — add inside `markModal`:
```json
"signInToMark": "Sign in to mark words and verses"
```

**`messages/ar.json`** — add inside `markModal`:
```json
"signInToMark": "سجّل الدخول لتحديد الكلمات والآيات"
```

### `useMarks` for unauthenticated users

`useMarks` is called unconditionally in `MarkModal`. When unauthenticated, `getPageMarks` hits the API, gets a 401, catches the error, and returns `{}`. Safe — no change needed.

## Files to Change

- `app/components/QuranSafha.tsx` — remove auth branch; always render `MarkModal`; remove `SignInModal` import
- `app/components/MarkModal.tsx` — add `useSession`; gate marks section on `isAuthenticated`; add sign-in prompt
- `messages/en.json` — add `markModal.signInToMark`
- `messages/ar.json` — add `markModal.signInToMark`

## Constraints

- Keep the `SignInModal` component file itself — it may be used elsewhere.
- The recitation button ("Play from here") and word pronunciation button must remain outside the auth-gated section — they must be accessible in all auth states (they already are, as they appear above the marks section in the JSX).
- Match `SignInModal`'s sign-in button style exactly: `bg-green-700 hover:bg-green-600 text-white`.
- Use the existing `"signIn"` translation key for the button label; only `markModal.signInToMark` is new.

## What NOT to Do

- Do not add auth gating around the recitation or word-audio controls.
- Do not open `SignInModal` as a second modal on top of `MarkModal` — the prompt is inline.
- Do not remove `SignInModal` from the codebase — only remove its usage from `QuranSafha`.
