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
surfaces `RecitationReturnStrip` — a second row of the nav. It toggles with the nav overlay
on mobile/tablet and pushes content down on desktop / non-reader routes; it never floats
over content, so the bar-overlap problem cannot recur.

## Decision

Option C. Recitation has one app-wide lifecycle and navigation never ends it. `RecitationContext`
owns `isFollowing` (attached/detached); the `RecitationFollow` leaf is the sole decider of the
transition (auto-advance keeps it attached, a manual anchor change or leaving the reader
detaches it, returning to the recited page re-attaches it) and `ReaderPager` gains no
recitation subscription. When `!isIdle && !isFollowing && recitedPage != null`,
`RecitationReturnStrip` renders as the last child of `<nav>` — a second nav row with
play/pause, "return to recited page" (`jumpTo` on the reader, `<Link>` off it), and stop.
Being a flow child of the nav, it hides with `translateY(-100%)` alongside the mobile/tablet
overlay and adds flow height (pushing content) everywhere else; while mounted it sets
`--fq-nav-extra` on `<html>` so the desktop reader / non-reader `min-height` calcs give the
band back and a short page stays one screen. `RecitationPlayerBar` drops its hard-stop effect
and renders only on reader routes.

## Consequences

- **+** Playback survives every navigation — the mechanism `RecitationContext` was built for
  (audio above the route tree) is finally used as intended, with no lifecycle guard fighting it.
- **+** The reader is browsable during playback; auto-advance still follows while the user is
  on the recited page, so the common "just listen" flow is unchanged.
- **+** The bar-overlap failure mode (Trello #152) is gone: the return surface is a nav row,
  so it reserves its own space (flow) or rides the overlay transform — never a free-floating
  element over content.
- **+** All new logic sits in the `RecitationFollow` leaf and a new leaf component; the pager's
  per-verse re-render firewall (ADR 0028) is preserved. `Nav` doesn't consume recitation —
  only `RecitationReturnStrip` does.
- **−** A new persistent-ish UI surface exists whenever the user is parked away from a live
  recitation, and it changes the nav's height — a reflow on show/hide for desktop / non-reader,
  and a `--fq-nav-extra` var that every future reader-height rule has to keep subtracting.
- **−** On mobile/tablet reader the strip is only visible when the chrome is revealed (it
  toggles with the nav) — a parked recitation has no always-on indicator there. Deliberate,
  matches the player bar.
- **−** `isFollowing` is a third piece of cross-cutting recitation state (with `recitedPage`
  and `status`) that every future navigation or reader-mount path must keep honest; the leaf's
  ref-diffing of `recitedPage` vs `anchor` to classify "who moved" is subtle.
- **−** An off-route Return always lands on the self reader `/pages/…`, never a grant reader
  route — the same accepted limitation `ContinueReadingLink` already carries.
- **−** Two prior decisions (ADR 0021's background-mini-player, then its hard-stop reversal)
  are now both superseded; the history of this area is a zig-zag and the ADR trail is the only
  way to follow it.
