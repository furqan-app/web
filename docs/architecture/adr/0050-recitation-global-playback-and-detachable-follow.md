# ADR 0050: Recitation plays for the whole app; follow is a detachable attach/detach state

**Date:** 2026-09-01
**Status:** Accepted

Supersedes [ADR 0021](./0021-recitation-playback.md) Addendum (2026-08-02) — the "hard stop on
route leave" — and the "manual navigation snaps the reader back to the recited page" clause of
the Recitation Playback decision in `DECISIONS.md`.

## Context

`RecitationContext` already owns the `<audio>` element above the reader's route tree, so
playback *technically* survives any navigation; two deliberate guards were layered on top to
stop it anyway. One (ADR 0021 Addendum 2026-08-02) hard-stops playback when the user leaves a
`/pages/` route, added because the full-width `RecitationPlayerBar` overlapped non-reader page
content. The other keeps the `RecitationFollow` leaf pulling the visible window back to the
recited page on every anchor change, so a user cannot browse elsewhere during playback. Both
have proven wrong in daily use: leaving the reader for a moment (a notification, Marks, Home)
should not cost the user their recitation, and checking a cross-reference a few pages away
should not fight the finger. The player-bar overlap that motivated the hard stop is a
placement problem, not a lifecycle problem.

## Options Considered

**Option A — keep both guards, just fix the bar overlap**
Reserve bottom padding on non-reader routes and keep hard-stop + forced follow. Cheapest, but
leaves the two behaviors users actually complained about untouched.

**Option B — global playback + always-follow with a "browsing" grace window**
Never stop on route leave; while in the reader, let the user swipe N pages away before
snapping back after a timeout. Rejected: a timed re-snap is exactly the yank users disliked,
just delayed, and it is hard to reason about.

**Option C — global playback + a two-state attach/detach follow + a return affordance (chosen)**
Playback ends only on stop / range-end / hard error. Follow is a single `isFollowing` boolean:
attached tracks and auto-advances; detached leaves the reader wherever the user put it and
surfaces a "return to recited page" affordance — inside `RecitationPlayerBar` on the reader
(whose band the layout already reserves), and as a small centered pill that reserves a flow
spacer off the reader. Neither floats over content, so the bar-overlap problem cannot recur.

## Decision

Option C. Recitation has one app-wide lifecycle and navigation never ends it. `RecitationContext`
owns `isFollowing` (attached/detached); the `RecitationFollow` leaf is the sole decider of the
transition (auto-advance keeps it attached, a manual anchor change or leaving the reader
detaches it, returning to the recited page re-attaches it) and `ReaderPager` gains no
recitation subscription. When `!isIdle && !isFollowing && recitedPage != null`, the way back
to the recited page appears **in `RecitationPlayerBar`'s utils zone** on the reader, and as
`RecitationReturnPanel` — a fixed centered pill that also renders an `aria-hidden` flow
spacer so the document reserves its height — off the reader. `RecitationPlayerBar` drops its
hard-stop effect and renders only on reader routes.

## Consequences

- **+** Playback survives every navigation — the mechanism `RecitationContext` was built for
  (audio above the route tree) is finally used as intended, with no lifecycle guard fighting it.
- **+** The reader is browsable during playback; auto-advance still follows while the user is
  on the recited page, so the common "just listen" flow is unchanged.
- **+** The bar-overlap failure mode (Trello #152) is gone: no recitation surface floats over
  content. On the reader the affordance is in the bar (reserved band); off-reader the pill
  renders a flow spacer that grows the scroll area by its own footprint, so page content
  always ends above it.
- **+** All new logic sits in the `RecitationFollow` leaf and a new leaf component; the pager's
  per-verse re-render firewall (ADR 0028) is preserved.
- **−** A new persistent-ish UI surface (the pill) exists whenever the user is parked away
  from a live recitation — one more thing that can feel in the way if the copy/placement is
  wrong.
- **−** `isFollowing` is a third piece of cross-cutting recitation state (with `recitedPage`
  and `status`) that every future navigation or reader-mount path must keep honest; the leaf's
  ref-diffing of `recitedPage` vs `anchor` to classify "who moved" is subtle.
- **−** An off-route Return always lands on the self reader `/pages/…`, never a grant reader
  route — the same accepted limitation `ContinueReadingLink` already carries.
- **−** Two prior decisions (ADR 0021's background-mini-player, then its hard-stop reversal)
  are now both superseded; the history of this area is a zig-zag and the ADR trail is the only
  way to follow it.
