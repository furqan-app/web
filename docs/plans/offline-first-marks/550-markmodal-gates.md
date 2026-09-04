---
title: MarkModal: offline marking + guest marking in the installed PWA
type: feature
date: 2026-09-04
status: ready-to-implement
area: marks
issue: 550
adr: [0061]
---

# MarkModal: offline marking + guest marking in the installed PWA

> Umbrella: [`INDEX.md`](INDEX.md). **Blocked by #546.**

## Summary

Remove the two gates that stop people marking — `isOffline` and `isAuthenticated` — within the
scope the umbrella's iOS section fixes.

## Scope of each gate

| Gate | Self mushaf, installed PWA | Self mushaf, plain browser tab | Grant mushaf |
|---|---|---|---|
| `isOffline` disables picker/textarea/Save/Remove | **removed** | **removed** | unchanged |
| `isAuthenticated` sign-in wall | **removed** | **kept** | unchanged |

Guest marking is gated to `isStandaloneDisplayMode()` because guest marks are single-copy and, in
a plain tab, iOS's 7-day cap applies while `persist()` is not granted. Offline marking for
*signed-in* users is not gated that way — their marks have a server replica. Full reasoning in the
umbrella.

## Files to change

- `app/components/MarkModal.tsx` — the gates; write to the store and fire a best-effort sync
  instead of awaiting `addPageMark`/`deletePageMark`; capture the denormalized fields; the
  pending status line; the guest prompt.
- `messages/ar.json`, `messages/en.json` — new strings in **both**.

## Constraints

- **Capture `snippet`, `chapter_name_simple`, `chapter_name_arabic` and `verse_number` into the
  record at creation time.** The modal already holds the word text and `verseDisplayText`, and
  `#551` cannot render offline or for a guest without them.
- **Keep the `?markWord=` `callbackUrl` contract.** `QuranSafha.tsx:317` consumes that param to
  reopen the modal after an OAuth return, and the guest prompt's `signIn()` is its only producer.
  Dropping it kills live code and two e2e tests.
- Guest-facing UI gates on the store's **owner stamp**, not `useSession()` — offline the session
  always reads as unauthenticated (test case 8).
- Save closes the modal immediately; the highlight is already there because the reader reads local.
- The pending status line shows **only** while the record is `pending`; nothing when synced. No
  per-mark badges in the reader.
- The existing offline notice becomes that status line rather than a blocker — reuse the string
  slot, do not leave a dead key.
- The comment textarea keeps `dir="auto"` per the free-text rule in `decisions/marks.md`.
- `grantId` set ⇒ nothing in this issue applies.

## UI/UX notes

Per `docs/design/design-principles.md` and `docs/standards/styling.md`: the guest prompt is one
dismissible line, not a card competing with the picker; the pending line sits with the existing
error/notice slot at the footer; both must clear contrast in all three themes and read correctly
in RTL and LTR.

## Test cases from the umbrella

1, 3, 4, 6.

## Done when

- Offline, a signed-in user can add, edit and remove a mark, and the modal closes immediately.
- In the installed PWA a signed-out user can mark, and the mark survives a reload.
- In a plain browser tab a signed-out user still sees the sign-in wall, and its `?markWord=`
  callback still restores the modal after returning.
- With `grantId` set, offline behaviour is unchanged.
