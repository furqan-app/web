# ADR 0013: PWA installability and offline Quran page caching

**Date:** 2026-07-06
**Status:** Accepted

## Context

The app is being made installable as a PWA. Beyond installability (manifest, icons), the app has 604 statically-generated Quran reading pages per locale, each inlining a dedicated per-page font (ADR/Font System decision in `DECISIONS.md` — ~92MB total across all 604 fonts, deliberately *not* loaded globally for a normal browser visit). Marks (bookmarks) are mutable, server-synced, per-user data with shared-mushaf last-author-wins semantics (ADR 0012). We need to decide what offline actually means here without reintroducing the "load everything" problem the font architecture specifically avoids, and without creating data-loss risk for marks.

## Options Considered

**Option A — Cache-as-visited only**
Pages/fonts are cached only when the user actually opens them (runtime caching). Lowest storage cost, but offline access is limited to pages already read.

**Option B — Full pre-cache of all 604 pages, background, installed-PWA only**
On the installed PWA (not the regular browser tab), a service worker pre-fetches and caches all 604 pages (current locale) plus their fonts in the background after launch, resuming on later launches until complete. Regular web visits never trigger this.

**Option C — Offline-capable marks (local queue + background sync)**
In addition to page caching, mark writes made offline are queued locally and synced on reconnect.

## Decision

Option B for page/font caching. Marks stay online-only (rejected Option C): the shared-mushaf model is last-author-wins across concurrent viewers, so a queued offline write could silently clobber a newer server-side edit made by another viewer in the meantime — a correctness/data-loss risk not worth taking for a first offline pass. When offline, the mark UI is disabled with an inline notice rather than allowed to fail on submit.

Pre-caching is gated to `display-mode: standalone` (installed PWA) specifically because unconditionally pre-caching ~92MB of font data for every regular browser visitor would contradict the Font System decision's whole rationale. Only the current locale's 604 pages are pre-cached — fonts are locale-independent (same file regardless of `/ar/` or `/en/` route) so they're fetched once regardless of locale; only the thin per-locale page shell would need re-fetching if the user switches language later.

Cache versioning for the pre-cached pages is independent of Serwist's per-deploy build-asset revisioning: bumping it is a manual, deliberate action (when reader markup/font-affecting logic changes), not automatic on every deploy, so routine deploys don't force every installed user to re-download ~92MB.

## Consequences

- **+** Regular (non-installed) web visitors see zero behavior change — no risk to the existing font-loading architecture.
- **+** Installed users get full offline reading after initial background sync completes, without a marks-conflict risk.
- **+** Deploys don't cost installed users repeated large background downloads unless explicitly warranted.
- **-** Marks remain unusable offline — accepted gap, revisit if offline mark-taking becomes a real ask.
- **-** iOS Safari (WebKit) enforces stricter, less predictable Cache Storage quotas/eviction for installed web apps than Chrome/Android; a ~92MB cache is at real risk of partial eviction on iOS. This is a known platform limitation, not a bug in this design — no mitigation planned beyond the "resume on next launch" retry behavior already decided.
- **-** The manual cache-version bump is a discipline requirement (a developer must remember to bump it) — no automated detection of "this change affects cached page output."

## Addendum 1 (2026-07-24): Reader-page HTML must not be CacheFirst

**Incident (Trello #122):** Users reported seeing the old version of the app after a deploy — both on regular browser visits (fixed by a hard refresh) and on the installed PWA (fixed only by clearing the site's cache). Root cause: two assumptions in this ADR didn't hold.

1. "Regular (non-installed) web visitors see zero behavior change" (Consequences, above) assumed the `display-mode: standalone` gate scoped the service worker itself to installed users. It doesn't — `@serwist/next` registers the service worker for every production visitor by default (`register: true`), regardless of display mode. The gate only controls whether the *bulk 604-page pre-cache* fires; it does nothing to scope the runtime-caching rules in `app/sw.ts`, which apply to any client the service worker controls — including a plain browser tab.
2. The reader-page runtime cache rule (`isSelfReaderPage`, matching `/{locale}/pages/{id}`) used `CacheFirst`, on the premise that "Quran content is immutable." That premise is true for the verse text and per-page fonts, but the route's HTML response also renders the app shell (nav, layout, any feature/UI code) — which is *not* immutable and changes on ordinary feature/bugfix deploys. Once a browser (regular or installed) cached that response, it never revalidated, so the shell stayed frozen at whatever it was when first cached, until the manual `PAGES_CACHE_VERSION` bump (itself scoped only to "reader markup/font logic changes" — too narrow to cover this).

**Fix:** `isSelfReaderPage` now uses `NetworkFirst` (same `pages-v{N}` cache name) instead of `CacheFirst`. `isPageFont` is unchanged (`CacheFirst`) — fonts genuinely never change. Effect: any online visit (browser or installed PWA) always gets the current deploy's HTML; the cache is used only as a fallback when the network request fails (i.e., the installed-PWA offline case this feature exists for). See `docs/plans/fix-sw-stale-cache.md`.

**This does not reopen the original Option B decision** (full pre-cache, installed-PWA-gated, no offline mark writes) — it corrects which caching strategy the pre-cached data is served with, not what gets pre-cached or when.
