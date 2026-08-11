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

## Addendum 2 (2026-08-10): The pre-cache trigger moves from display-mode to explicit consent

**Context (Trello #187).** The original design fills the offline cache silently in the background across the user's first several installed-app sessions, surfaced only as an ambient progress bar in Settings. Two problems with that as a product: the user never chooses when a ~48 MB transfer happens, and nothing tells them offline reading is not yet ready — they find out by going offline and hitting a broken reader. The requirement is now that the download happens up front, ideally before the app is first opened.

Measured, for the base (madani) mushaf: 45.7 MiB of per-page WOFF2 + ~2.0 MiB of gzipped per-page JSON + 12 KB verse-pages map = **≈48 MB over the wire, ≈67 MiB in Cache Storage** (JSON is stored decompressed). Fonts are ~95% of the transfer and are already compressed.

**The platform constraint that shapes this.** iOS Safari fires neither `beforeinstallprompt` nor `appinstalled`; Add to Home Screen is completely silent to JS. On iOS the earliest reachable hook is literally the first standalone launch, so "download before first open" cannot be achieved there by any mechanism. Chromium does fire `appinstalled`, in the still-open browser tab, and shares Cache Storage between that tab and the installed PWA (same origin, same profile) — so there, it can.

**Decision.** The bulk pre-cache becomes **user-initiated on an explicit tap** and is offered on three surfaces: an in-tab prompt on `appinstalled` (Chromium), a blocking full-screen gate on first standalone launch (all platforms), and a permanent Settings button. Nothing auto-starts anywhere. The ambient Settings progress bar is removed.

The trigger condition therefore changes from **`display-mode: standalone`** to **explicit consent** — a completed install *plus* a tap. This narrows, but does not abandon, the constraint that made the standalone gate load-bearing: DECISIONS.md forbids *unconditionally* pre-caching page fonts for regular web visitors, because that would undo the whole point of the per-page font-inlining architecture. A browser tab that has not seen an `appinstalled` event still downloads nothing, ever. What is newly permitted is 46 MB of font traffic in a browser context, for a user who has just installed the app and then tapped Download.

Completion is recorded as a synthetic sentinel `Response` at `/__fq-precache-complete` inside `pages-v{N}`, written only after a fully successful run. This makes the version-scoping automatic and short-circuits the 604-iteration loop that previously re-ran on every single standalone launch (Trello #129).

The sentinel is **not** trusted on its own. Removing the per-launch re-walk also removed the only thing that healed an evicted cache: the old loop refetched whatever was missing every launch, so partial eviction — the platform risk this ADR already flags as iOS's worst — repaired itself as a side effect of the waste #129 complained about. A sentinel-only completeness check would instead report a partially-evicted cache as ready forever. So `isCacheComplete` requires the sentinel **and** a page count derived from `cache.keys()` equal to 604 **and** the verse-pages map; a cache that fails has its stale sentinel deleted and falls through to a resuming run. The count is pure string work over the key list with no per-entry reads, so the #129 fix stands. This was found by deleting one font from a live cache and observing the pre-fix code still report `complete: true`. A separate `localStorage` flag, also scoped to the cache version, records that a surface was dismissed so the user is not re-prompted; it is set on dismissal only, never on download start, so an interrupted run is re-offered by the gate rather than silently abandoned.

The 200 ms inter-page throttle is removed in favor of concurrency-6 batches. It existed to keep a silent background pre-cache from starving an active reader's font fetches — a situation that no longer occurs now that the pre-cache is always foreground and user-initiated. It also imposed a hard 604 × 200 ms ≈ 2 minute floor that would have dominated the transfer and made the blocking gate needlessly slow.

**Consequences**

- **+** The user is told the size before anything transfers, and offline readiness becomes a visible state rather than something inferred from a broken reader.
- **+** On Chromium the transfer completes before the installed app is first opened — the original requirement.
- **+** Routine standalone launches stop re-running the 604-page loop (Trello #129).
- **−** iOS still cannot download before first open; it gets the blocking gate instead. Accepted platform limitation, same root cause as the Cache Storage quota note above.
- **−** A deliberate `PAGES_CACHE_VERSION` bump now re-shows the blocking gate. This reads against this ADR's original "routine deploys don't force re-downloads" intent, but that intent concerns routine deploys, which no longer bump the version at all; a bump asserts the cached data is wrong, so re-prompting is correct. It remains skippable.
- **−** The in-tab pre-warm is best-effort: closing the tab mid-download may have the service worker killed. Mitigated by resumability plus the first-run gate.
- **−** Three surfaces share one state machine, so the state model (sentinel + version-scoped dismissed flag) is now load-bearing in a way a single silent trigger was not. Getting the "don't write the sentinel on a partial run" rule wrong would report "Ready" for a cache that cannot serve offline.

Tajweed remains excluded from bulk pre-cache (ADR 0023) — bulk-caching both editions would be ~99 MB / ~138 MiB against an already-fragile iOS quota. A separate opt-in tajweed download is future scope. See `docs/plans/pwa-offline-support.md` Addendum 1.

### The `globPublicPatterns` default silently violated this ADR from the start

Verifying the above surfaced that none of this ADR's "regular visitors see zero behavior change" claims had ever actually held. `@serwist/next`'s `globPublicPatterns` defaults to `["**/*"]`, which swept the whole of `public/` into the **service worker's install-time precache manifest** — measured at 2482 entries: 604 base WOFF2, 604 tajweed COLRv1 WOFF2, 1208 page JSON (both editions), against only 59 real build assets. Install precache is unconditional, all-or-nothing, and completely indifferent to `display-mode`, so **every production visitor in a plain browser tab downloaded ~137.7 MiB** the moment the service worker installed.

This contradicted three separate decisions at once: this ADR's Consequences ("+ Regular (non-installed) web visitors see zero behavior change"), the load-bearing "never unconditionally pre-cache page fonts for regular web visitors" constraint in DECISIONS.md, and ADR 0023's exclusion of tajweed fonts from precache. It also made the consent-gated download meaningless — the bytes it asks permission for had already been fetched.

**Fix:** `globPublicPatterns` is pinned to the app shell only (`icon.svg`, `icons/**/*`, `quran/chapters.json`) in `next.config.mjs`. Page fonts and page JSON are reached exclusively by the two consent-respecting paths — the runtime `CacheFirst` rules (cache-as-visited) and the user-initiated bulk precache.

**Do not add font, page-JSON, or verse-pages globs back to `globPublicPatterns`.** Anything listed there is fetched by every visitor with no gate of any kind; it is not governed by the standalone check, the dismissed flag, or the sentinel. New bulk `public/` asset directories default to being swept in, so this option must be revisited whenever one is added.

How it was found: moving a single font aside to induce a partial-run state left the service worker stuck in `installing` (install precache fails atomically on one 404), which exposed the manifest. `navigator.storage.estimate()` reporting 213.8 MiB against a 67.1 MiB page cache was the same signal, noticed earlier and not pursued.
