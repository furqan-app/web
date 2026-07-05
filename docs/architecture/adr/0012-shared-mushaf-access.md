# ADR 0012: Shared mushaf access via one-time codes and grant-scoped marks

**Date:** 2026-07-04
**Status:** Accepted

## Context

Users (informally "teachers") need to view and edit the marks on another user's
mushaf (their "student"). The app has no user directory or user-search surface,
and the `furqan_app` DB must stay the only place this lives (the Quran DB stays
device-shippable, per ADR 0008). The `Mark` model already separates `from_user`
(author) from `to_user` (whose mushaf the mark lives on), so the data model was
built anticipating cross-user marks — only the access-control layer and the
write path (which currently hardcodes `to_user = from_user = self`) are missing.

## Options Considered

**Option A — Directory search + request/approve inbox**
Teacher searches users by name/email and sends a request the student approves.
Requires a user-search endpoint (exposes names/emails app-wide) and an approval
inbox with notifications.

**Option B — Student-issued one-time codes, immediate grant on redeem**
The student generates a single-use code and hands it to the teacher out-of-band;
redeeming it instantly creates a persistent grant. No directory, no approval
step (the code *is* the consent), no notification surface.

**Option C — Reuse the reader route with an `?owner=` param**
Serve the other user's mushaf from `/pages/[id]` in an "owner" mode. Rejected in
favour of a dedicated route tree so the viewer context can't leak into the
statically-generated self-reader and link prefixes stay explicit.

## Decision

**Option B.** Access is granted by redeeming a **one-time share code** the mushaf
owner generates; redemption creates a persistent `MushafAccessGrant`
(`owner_user` → `viewer_user`) and spends the code. The viewer opens the mushaf
at a **dedicated route** `/[locale]/mushaf/[grant]/pages/[id]`, where `[grant]` is
the grant's random id. All grant-scoped marks reads/writes go through
`/api/mushaf/[grantId]/pages/[pageId]/marks`, which authorizes that
`grant.viewer_user === authenticated user`, then operates with `to_user =
grant.owner_user` and `from_user = authenticated user`. Marks stay **one per spot
per mushaf** (unchanged unique key `[marked_type, marked_id, mark_type, to_user]`)
— last author wins — and `from_user` is surfaced as the mark's author name so any
viewer can see who made each mark.

## Consequences

- **+** No user directory / no name/email exposure; the owner controls exposure by
  choosing whom to hand a code to, and codes are single-use so a leaked link
  can't be reused.
- **+** No schema change to `Mark`; the existing `from_user`/`to_user` split does
  all the work. New tables are pure app-domain, scalar user refs only (matching
  `Mark`), so ADR 0008's cross-domain invariant is untouched.
- **+** Dedicated route keeps the viewer context out of the static self-reader and
  makes link-prefixing explicit rather than conditional on a query param.
- **-** The grant id sits in the URL; enumeration is possible, so every
  grant-scoped endpoint must re-check `grant.viewer_user === self` server-side
  (the id is not a capability by itself). A random grant id mitigates but does not
  replace the check.
- **-** "Last author wins" means a teacher's edit overwrites the student's mark on
  the same spot (and vice-versa) — accepted; there is no per-author mark stacking.
- **-** Revocation is owner-driven only and immediate; a viewer mid-session keeps
  no cached write capability because every write re-checks the grant.
- **-** A second reader route tree must keep its page-navigation links
  (arrows, swipe, sidebar) prefix-aware, or navigation silently drops back to the
  self-reader.
- **Security hardening (added post-review).** Grant-scoped writes rest on the
  `user` header `auth-middleware` injects, so the middleware must **strip any
  client-supplied `user` request header** and forward the trusted token via
  `NextResponse.next({ request: { headers } })` — never `response.headers.set`.
  Otherwise a client could forge the header and write into another user's mushaf,
  and the decoded token would leak to the browser. This applies app-wide (the
  self-marks route shares the mechanism) but is load-bearing here because these
  routes write cross-user. See DECISIONS.md → Auth.
