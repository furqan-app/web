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

## Addendum 3 (2026-08-12): Standalone detection missed `fullscreen`; navigation still required per-page HTML

**Context (Trello #194).** Two reports arrived together: (1) a cold offline launch shows a blank shell instead of the reader; (2) offline, swiping between pages works but tapping a surah in the nav sidebar or from the home page does nothing. A third report — the Settings offline row not appearing at all on an installed Android device — turned out to share a root cause with neither of the above.

### Bug: `isStandaloneDisplayMode()` never checked `display-mode: fullscreen`

`app/manifest.ts`'s `display` was changed from `"standalone"` to `"fullscreen"` for Android status-bar hiding (`docs/plans/feature-pwa-fullscreen-focus-mode.md`, 2026-07-31) — three weeks *after* Addendum 2's `isStandaloneDisplayMode()` (`app/hooks/use-pwa-precache.ts`) was written against the `"standalone"` value. On any platform that actually honors `fullscreen` as the effective display mode, `matchMedia("(display-mode: standalone)")` never matches, so `isStandalone` is `false` for the entire session — the Settings row (`isStandalone` gate), the first-run blocking gate, and by extension the entire consent-gated download flow this ADR's Addendum 2 describes all silently no-op. The one download that visibly worked went through the in-tab `appinstalled` prompt, which does not check display mode at all — that's why the feature appeared to work once and then never showed status again.

**Fix:** `isStandaloneDisplayMode()` also checks `matchMedia("(display-mode: fullscreen)")`. This does not reopen Addendum 2's decision — explicit consent (install + tap) is still the trigger; this only fixes which display modes count as "the installed app" for gating purposes.

**Constraint:** any future manifest `display` change must be cross-checked against every `matchMedia("(display-mode: ...)")` gate in the codebase — there is no single source of truth tying the two together, so this class of drift can recur silently (no error, no console warning — the affected surfaces just don't render).

### Gap: precached JSON+fonts don't help a document that never loads

Addendum 2 (and the original decision) built pre-caching around per-page JSON + fonts consumed client-side, specifically to avoid the ~1.5 GB cost of caching all 604 pages' SSR HTML. That was the right call for the mechanism `ReaderPager`'s swipe already uses (`history.replaceState`, no navigation, no document fetch) — swiping to a never-visited page works offline today, exactly as designed.

It silently assumed every *other* way of reaching a page was equivalent. It is not: `SurahListItem`, `RubList`, the home page's surah list, and `ContinueReadingLink` all use next-intl's `<Link>` — a real Next.js navigation that fetches that specific route's document/RSC. `isSelfReaderPage` caches that `NetworkFirst` in the same `pages-v{N}` cache (Addendum 1), but only for pages actually visited online — never part of the bulk precache. Offline, a jump to any page not already visited this session has no cache entry and no network: the navigation fails outright. The same gap exists one level up for `start_url: "/"` — a cold offline launch needs the home route's document, which is cached only opportunistically (defaultCache's LRU-capped, 24h-aged "others"/html buckets), not guaranteed.

**Fix:** Serwist's `Serwist.setCatchHandler()` registers a single global fallback invoked whenever any matched route's strategy fails to produce a response (network error, no cache hit) — this fires regardless of which specific rule (`isSelfReaderPage`, defaultCache's RSC/html/others buckets) originally matched the request, so it is one fix point for cold launch, sidebar taps, and home-page taps alike. For a failed navigation request (`request.mode === "navigate"`), it serves a small always-precached fallback document (`/{locale}/pages/1` for the requesting locale — independent of and much smaller than the consent-gated 48 MB bulk download, so it works even before that download ever runs). The client reads the actually-requested path from `location.pathname` on mount and self-corrects: if it names a page other than 1, `ReaderPager.jumpTo` moves there client-side from precached JSON — the exact mechanism already used for mushaf-edition switches — falling back further to the user's last-read page when the target itself isn't cached, and to page 1 when neither is known.

**Consequence:** offline navigation to any page — visited or not — now degrades to "the page 1 shell loads, then corrects itself," rather than failing outright. The correction is visible for a moment (a real page-1 flash before `jumpTo` lands), which is inherent to the fallback approach: the browser has already committed to *a* document before the client can know which page was actually requested. This is treated as acceptable, not eliminated, matching how Addendum 2 accepted the gate's post-SW-round-trip appearance for the same reason.

**Constraint:** `SurahListItem`/`RubList`/`ContinueReadingLink` route through `ReaderPager.jumpTo` instead of `<Link>` navigation whenever a pager instance is already mounted (i.e., the sidebar was opened from within the reader) — this needs no fallback shell at all, the same as swipe. The fallback document is the path only for navigations that start *outside* a mounted reader (home page, cold launch).

## Addendum 4 (2026-08-15): Reader-page HTML returns to `CacheFirst`, made safe this time

**Supersedes (in part):** Addendum 1's blanket "must not be `CacheFirst`" — replaced with a specific
mechanism that avoids that incident's actual failure mode, not a reopening of the original mistake.

**Context (Trello #312).** `NetworkFirst` (Addendum 1) has no `networkTimeoutSeconds`, so a slow-but-
working connection waits indefinitely for the full response instead of falling back. Reported concretely:
a user with the full 48 MB offline download already in place still saw slow/broken reader loads on 3G,
because the JSON+font content being local doesn't help when the *document* itself is still gated on a
slow network round-trip. Timeout-tuning `NetworkFirst` was considered and rejected in favor of getting
`CacheFirst`'s actual speed back — instant regardless of connection quality — once it can be done without
reintroducing Addendum 1's incident.

**What makes it safe this time — four independent pieces, not a strategy swap alone:**

1. **Cache name is auto-versioned per deploy**, not manually bumped — `reader-html-{hash}`, decoupled
   from `PAGES_CACHE_VERSION` (which stays reserved for font/JSON data-shape changes only — unchanged
   scope). Every deploy gets a clean, empty cache namespace for this route; there is no version to
   forget to bump. The hash is a cheap non-cryptographic checksum of the precache manifest Serwist
   itself injects into `self.__SW_MANIFEST` at build time — every entry's `revision` is a content hash,
   so this changes whenever any precached asset changes, true on effectively every real deploy. A
   webpack `DefinePlugin` custom value (`webpackCompilationPlugins`, injecting a build timestamp) was
   tried first, as planned, and silently never fired — see Implementation Notes below.
2. **`activate` deletes stale `reader-html-*` caches**, leaving `pages-v{N}` (the 48 MB user-downloaded
   font/JSON cache, plus the offline-navigation fallback document — see point 5) untouched. Without
   this, every deploy leaves the previous version's cached HTML orphaned in Cache Storage indefinitely.
3. **`skipWaiting`/`clientsClaim` stay `true`, unchanged.** No app-wide update-consent gate. A prior
   draft of this addendum considered flipping `skipWaiting` to require user consent before any new SW
   activates at all — rejected: SW updates are all-or-nothing for the whole app, so that would have
   gated every future fix (offline-download logic, marks, push notifications) behind a manual tap, not
   just reader HTML.
4. **A `controllerchange`-driven banner**, not silent reload. `clientsClaim` alone does not force a new
   document request from an already-open tab — most in-app navigation is client-side, so the reader-HTML
   document handler may not fire again for the rest of a long session (an independent review surfaced
   this: a backgrounded-not-relaunched installed PWA, common on iOS/Android, can sit on stale app-shell
   code indefinitely without ever making a new request). Once a new SW has taken control in the
   background (`controllerchange` fires), a lightweight "new version available" banner prompts a reload
   rather than forcing one — a silent reload would drop the user's reading scroll position mid-session.

**Matcher precision (found by an independent Codex review of this addendum before it shipped):**
`isSelfReaderPage` matches on `url.pathname` alone, with no request-mode check, and is registered ahead
of `...defaultCache` in the `runtimeCaching` array — so it currently wins over Serwist's own dedicated
RSC matcher for the *same URL*. A soft-nav to an unmounted reader page (`SurahListItem`/`RubList`/
`ContinueReadingLink`, Addendum 3) issues an `RSC: 1` fetch to that exact path. Under `NetworkFirst` this
was latent but harmless (both paths hit network regardless); under `CacheFirst` it is not — an RSC
flight-data payload could get cached in `reader-html-{hash}` and later served back for a plain
document request expecting real HTML, the same failure shape as `docs/plans/fix-rsc-cache-poisoning.md`,
relocated to the service-worker layer. **Fix:** `isSelfReaderPage`'s matcher gains a `request.mode ===
"navigate"` guard, so RSC-flagged fetches fall through to `defaultCache`'s own RSC rule instead.

**Known, accepted residual risk — CDN staleness can get pinned for a whole deploy.** [ADR 0035](0035-bounded-revalidate-on-static-document-routes.md)
already bounds Hostinger's edge cache to 5 minutes for these routes. Under `NetworkFirst`, that window
self-heals on every request. Under `CacheFirst`, the *first* fetch that populates a fresh deploy's new
cache name — if it happens to land inside that 5-minute post-deploy window — can pin a stale-but-recent
response for the entire deployment's lifetime, not just 5 minutes. This project's own prior incident
(`fix-rsc-cache-poisoning.md`) established that Hostinger strips query params from its cache key, so a
cache-busting query param on the SW's populate-fetch will not reliably defeat this. **Accepted knowingly**
(2026-08-15): the exposure is rare (must land in a 5-minute window) and no client-side fix reliably
closes it against this specific CDN's behavior; the failure shape, if it ever hits, matches Addendum 1's
original incident. Revisit if it is ever actually observed — a deploy-time cache-warm/purge step against
Hostinger's edge would be the real fix, out of scope here.

**Fallback document reconciliation.** Addendum 3's offline-navigation fallback document (`/{locale}/pages/1`)
was precached into `pages-v{N}` at `install`, sharing that cache with the font/JSON precache. It moves to
`reader-html-{hash}` alongside the rest of the reader-HTML cache, so it also auto-refreshes per deploy
instead of being fetched once at first install and never revalidated (a smaller instance of the same
staleness class this addendum otherwise fixes).

**Implementation note (2026-08-16): the planned `webpackCompilationPlugins` mechanism doesn't work —
found and fixed during the build, not left in.** The plan called for a webpack `DefinePlugin` injecting a
build timestamp via `@serwist/next`'s `webpackCompilationPlugins` option, targeting
`process.env.READER_HTML_BUILD_STAMP`. It builds cleanly with no error or warning, but the value is
silently unset at runtime — confirmed by inspecting the built `public/sw.js`, which showed a genuine
`require("process")`-shaped runtime property read instead of an inlined string literal. The worker-target
child compilation resolves bare `process` through its own polyfill; that appears to resolve before
DefinePlugin's matcher can fire on the `process.env.X` expression, though the exact precedence was not
conclusively isolated. Retargeting the define at a `self.__READER_HTML_BUILD_STAMP__` global instead
(matching this file's own `self.__SW_MANIFEST` precedent) hit the identical failure — inspected the same
way, same result. Given the failure mode is silent (no build error, `?? "dev"` just quietly wins every
time) rather than loud, and would have reintroduced this Addendum's whole reason for existing — every
deploy producing the same cache name, never busting — it was not left as a "probably fine" guess.

**Shipped instead:** the cache-name hash is derived from the precache manifest Serwist already injects
into `self.__SW_MANIFEST` at build time (`app/sw.ts`'s `hashString(JSON.stringify(precacheManifest))`,
where `precacheManifest` is `self.__SW_MANIFEST` captured once — InjectManifest requires that exact
global be referenced exactly once in the source and fails the build otherwise). This reuses a mechanism
already proven correct in this exact build (verified: the injected manifest's real per-deploy content
hashes and build-ID-scoped asset URLs are directly visible in `public/sw.js`) rather than a second,
unverified build-time injection path. Verified end to end: a full `npm run build:local` production build
succeeds, `offline-ar.html`/`offline-en.html` are present in the precache manifest, and the reader-HTML
cache name resolves to a real computed hash rather than the `"dev"` fallback.

See `docs/plans/pwa-offline-support.md` Addendum 4 for the full file-level implementation and the
route-aware `setCatchHandler` fix shipped alongside it.

**What NOT to do:** do not precache all 604 pages' HTML to solve this — that reopens the exact ~1.5 GB problem the original decision rejected. Do not make the fallback document depend on the bulk download being complete — it must work as the very first thing a fresh install can serve offline, before any consent-gated download has run.

## Addendum 5 (2026-08-17): Edition-aware bulk precache

**Trello/Issue:** [#256 Unify Tajweed toggle + offline downloads into one Mushaf Layout setting](https://github.com/furqan-app/web/issues/256)

**Context.** Addendum 2 made the bulk precache explicit-consent, but scoped it to a single hardcoded `PRECACHE_MUSHAF_ID = 2` — the default edition only. The Settings "Mushaf Layout" redesign lets a user independently download any registered edition (today: the default 1405H-print mushaf and the Tajweed mushaf) for offline use, with both kept simultaneously if the user chooses — no eviction.

**Decision.** The precache mechanism becomes edition-parameterized rather than edition-fixed, without changing its consent model: still never automatic, still only on an explicit tap, per row, per edition.

- `app/constants/offline.ts`: `PRECACHE_MUSHAF_ID` (a single constant) is replaced by iterating `MUSHAF_EDITION_IDS` (`app/utils/mushaf-editions.ts`). `pageFontUrl`/`pageJsonUrl`/`VERSE_PAGES_URL` become functions of `mushafId` as well as page.
- The completion sentinel (`PRECACHE_SENTINEL_URL`) becomes per-edition (`/__fq-precache-complete-{mushafId}`) inside the same versioned `pages-v{N}` cache — a single shared sentinel would report "ready" once any one edition finished, silently misreporting the others.
- `countCachedPages`'s path regex must extract and group by the `{mushafId}` segment of `/quran/pages/{mushafId}/{page}.json`, not assume a single fixed prefix.
- `ClientToSwMessage`/`SwToClientMessage` gain a `mushafId` field alongside `runId`, so one edition's progress cannot drive another row's UI — `runId` alone was sufficient when only one download could ever be in flight; two independently-triggerable downloads need both.
- `PRECACHE_DISMISSED_KEY` becomes per-edition for the same reason the sentinel does.
- First-run gate and install-prompt behavior are **unchanged** — they still offer the default edition only (Addendum 2's decision stands); this addendum only extends the permanent Settings surface to every registered edition.

**Consequence.** This narrows, but does not remove, ADR 0023's precache exclusion for the tajweed edition — see that ADR's Addendum 7. The `~99 MB` combined download if a user downloads both editions is accepted (product decision, not re-litigated here); no warning gate is added when a second edition is downloaded.

**What NOT to do:** do not make the two editions share a completion sentinel, dismissed-flag, or `runId`/progress channel — each of those was sized for exactly one downloadable edition and silently cross-reports otherwise. Do not change the first-run gate or install-prompt to offer edition choice — they stay single-edition (the default), per Addendum 2.

## Addendum 6 (2026-08-23): Fast reader-shell fallback on slow networks

**Issue:** [#376](https://github.com/furqan-app/web/issues/376)

**Context.** Addendum 4's `CacheFirst` for reader-page HTML only fast-paths cache *hits*. On a cache
miss over a slow-but-alive connection, a cold launch to an unvisited page 2–604 stalls on the full SSR
document fetch — the `setCatchHandler` fallback fires on network *error*, never on slowness. Yet when
the consent-gated bulk download is complete, every page renders client-side from cached JSON + font;
the SSR fetch adds nothing but delay.

**Decision.** The reader-page navigation handler becomes a four-row decision tree instead of a bare
`CacheFirst`: (1) cache hit → serve as before; (2) miss + bulk precache complete → serve the precached
fallback shell immediately, network untouched, and let ADR 0042's pre-paint `jumpTo` self-correction
land the requested page; (3) miss otherwise → race the navigation-preloaded fetch against 3s, serving
the fallback shell if the timer wins while the fetch continues in the background and is still cached
under its real URL on arrival; (4) no fallback doc at all → today's terminal behavior.

**Trade-off accepted:** row 2 means users with a complete download stop receiving true SSR HTML on
cold launches to unvisited pages — the shell + client render replaces it. This is deliberate: the
rendered result is identical (same words, same fonts from the same immutable sources), and paint speed
is bounded by local I/O rather than the network. Row 3's late-caching converts each fallback-then-fetch
page into a row-1 hit for subsequent launches.

**What NOT to do:** do not abort the background fetch when the fallback wins row 3 — it is what warms
the cache. Do not bulk-precache page HTML to avoid the tree entirely (~1.5 GB, rejected since ADR
0028). Do not drop the `request.mode === "navigate"` matcher guard or the per-deploy auto-versioned
cache name — both remain load-bearing from Addendum 4.

## Addendum 7 (2026-08-27): The fallback shell becomes a build-time precache entry

**Issue:** [#438](https://github.com/furqan-app/web/issues/438) (epic #375)

**Supersedes:** Addendum 4's "Fallback document reconciliation" paragraph — the shell moves out of
`READER_HTML_CACHE_NAME` again, this time into Serwist's own precache manifest rather than back into
`pages-v{N}`. Everything else in Addendum 4 (the per-deploy cache name, the `activate` prefix cleanup,
the `navigate` matcher guard, the update banner) is untouched.

**Context.** Addendum 4 seeded the two fallback shells (`/ar/pages/1`, `/en/pages/1`) with a custom
`install` handler calling `ensureCached()`, which swallows failures by design. So install could
complete having cached neither shell, and `activate` then deleted the previous deploy's
`reader-html-*` cache unconditionally. The resulting state — new worker active, empty reader-HTML
cache, previous deploy's cache gone — makes Addendum 6's rows 1 **and** 2 both unreachable: every cold
launch falls into row 3's 3 s race and then row 4's raw document fetch, and stays there for the whole
deploy until some online visit to page 1 happens to repopulate the cache. That is the reported
"downloaded the whole mushaf and it is still slow", and it is sticky rather than one-shot.

**Decision.** Both shells become entries in the build-time precache manifest, appended by a
`manifestTransforms` entry in `next.config.mjs`; `serveReaderFallbackShell()` and the reader branch of
`setCatchHandler` resolve them with `serwist.matchPrecache()`, the same way `offline-{ar,en}.html`
already does. The custom `install` handler is deleted as redundant.

`globPublicPatterns` is deliberately **not** the mechanism, and stays app-shell-only. It is globbed
inside the `webpack()` config phase, before Next generates any static HTML, so a build step emitting
the shell into `public/` is always one build stale — and a stale shell carries the previous build's
`/_next/static/chunks/*` URLs, which 404 after deploy. `additionalPrecacheEntries` is not the mechanism
either: in `@serwist/next` it *replaces* the public glob rather than extending it, which would silently
drop `launch.html`, the offline documents and the icons from the precache.

**What this actually buys — atomicity, not "no network".** A precache entry is still fetched at install.
The difference is that `PrecacheStrategy` refuses a non-cacheable response, so the worker cannot
activate without its shell, and a failed install leaves the previous worker and all of its caches
intact instead of tearing them down with nothing to replace them. Serving a hydratable Next document
with zero install-time network is not reachable at all: the shell must carry the current build's chunk
URLs, so it cannot be authored by hand or carried over from a previous deploy.

**How a failed precache actually fails** (verified against the installed packages, 2026-08-27 — an
earlier draft of this addendum said "throws, so the worker is discarded", which is imprecise).
`PrecacheStrategy._handleInstall` does throw `bad-precaching-response`, but `Serwist.handleInstall`
drives every entry through `@serwist/utils`' `parallel()`, whose worker lanes are
`new Promise(async (res) => …)` with no `reject` captured — its own docblock says it "does not handle
any error". A throw inside a lane therefore leaves that lane permanently unsettled, `Promise.all` never
settles, and the promise handed to `event.waitUntil` hangs; the worker is discarded by the browser's
install timeout rather than immediately. The guarantee this addendum rests on is unaffected — `activate`
still never runs, so nothing is torn down and the previous worker keeps serving — but the shape is
"stuck installing, then timed out", not "fails fast". This is upstream behavior that already applied to
`launch.html`, the offline documents and the icons; what these two entries add is a URL served by a
route that can 5xx, where the others are static files.

Each entry's revision is a hash of the webpack manifest the transform receives, the same input class
`READER_HTML_CACHE_NAME` already hashes — shell freshness and reader-HTML cache busting therefore move
together by construction rather than by convention. It inherits that hash's blind spot too: a deploy
that changes the shell's server-rendered HTML without moving any client asset hash (a server-resolved
translation edit, say) leaves the revision equal and the stale shell in place until an unrelated deploy
bumps a webpack asset.

**Consequences**

- **+** Row 2 becomes reliable: with a complete download, a cold launch to an unvisited page paints
  from local storage with no document fetch on the critical path.
- **+** A flaky install can no longer strand a device on rows 3/4 for a whole deploy.
- **−** `PrecacheRoute` is registered ahead of `runtimeCaching`, so navigations to `/{locale}/pages/1`
  now come from the precache and bypass the four-row tree entirely. Same bytes, no network — accepted.
  RSC soft-navs to the same path are unaffected: Serwist's precache matcher only strips `utm_*`/`fbclid`
  from the query, so the `?_rsc=` parameter Next appends prevents a match and those requests still fall
  through to `defaultCache`'s RSC rule. This is the `request.mode === "navigate"` concern from Addendum
  4 arriving at a different layer, and it must be re-verified in a production build, not assumed.
- **−** The worker's update path is now coupled to that route's availability: a 5xx from
  `/{locale}/pages/1` (its `revalidate = 300` re-render can hit the database) fails the install and
  blocks the whole service-worker update until a later attempt succeeds — via the hang-then-timeout
  path described above, so the block lasts as long as the browser's install timeout. Accepted
  (2026-08-27): install is already atomic for `launch.html` and the icons, the browser retries on every
  navigation update check, and the failure mode is "stay on the previous deploy", not "break".
- **−** The shell's revision cannot see server-only content changes (see above). Bounded, not fixed:
  the route is still `CacheFirst` under a per-deploy cache name for every page *other* than page 1, and
  page 1's shell is a launch surface the pre-paint `jumpTo` corrects away from within the first frame.

**What NOT to do:** do not widen `globPublicPatterns` to reach the shell, and do not add a post-build
step that copies built HTML into `public/` — both are the stale-chunk trap above. Do not pass
`additionalPrecacheEntries` to `withSerwistInit`. Do not keep the `install`-handler seed "as a backstop"
alongside the precache entry — two shell locations to reason about, and the atomic entry is what the
guarantee rests on. Do not make `activate` spare a stale `reader-html-*` cache in the hope of reusing
last deploy's shell; those chunk URLs are gone.
