# Marks — Decisions

Active decisions for marks & sharing — categories, comments, shared mushaf access. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Shared Mushaf Access

**Status:** active

**Decision:** A user can view and edit another user's mushaf marks. Access is granted by redeeming a **one-time share code** the owner generates (the code *is* the consent — no approval step, no directory/user-search). Redeeming a code creates a persistent `MushafAccessGrant` (`owner_user` → `viewer_user`) and marks the code spent. The viewer opens the mushaf at the dedicated route `/[locale]/mushaf/[grant]/pages/[id]` (`[grant]` = the grant's random id) and reads/writes marks via `/api/mushaf/[grantId]/pages/[pageId]/marks`. See [ADR 0012](../adr/0012-shared-mushaf-access.md).

**Constraints:**
- New models (`MushafAccessGrant`, `MushafShareCode`) live in `furqan_app` only and reference users by scalar `Int` id (no Prisma relations), matching `Mark` and preserving ADR 0008's no-cross-domain-FK invariant.
- No change to `Mark`: the unique key stays `[marked_type, marked_id, mark_type, to_user]` (one mark per spot per mushaf, **last author wins**). Grant-scoped writes set `to_user = grant.owner_user`, `from_user = authenticated user`.
- The grant id in the URL is **not** a capability — every grant-scoped endpoint (marks GET/POST/DELETE and the `/mushaf/[grant]` page/layout) must re-verify `grant.viewer_user === extractUser(request).id` server-side. A random grant id mitigates enumeration but does not replace this check.
- Marks responses now include `from_user` and the author's display name so any viewer can see who made each mark. Author is surfaced in `MarkModal`. `getColorMark`/existing consumers must stay backward-compatible (fields added, none removed).
- Add `/api/mushaf/[0-9a-z]+/pages/[0-9]+/marks` to the `auth-middleware` `protectedRoutes` matcher — new protected routes require the same middleware coverage as the self marks route (see Middleware Chain).
- The `/mushaf/[grant]/...` reader reuses the self-reader components but must thread a **base path** (`/${locale}/mushaf/${grant}/pages` vs `/${locale}/pages`) through page-navigation links (arrows, `QuranSwipeNav`, `Sidebar`), or navigation silently falls back to the viewer's own mushaf. Revocation is owner-driven and immediate.
- **Client-side revocation redirect:** When a grant is revoked during an active reader session, any subsequent grant-scoped marks API request (`/api/mushaf/[grantId]/pages/[pageId]/marks`) returns `403 Forbidden`; the client actions (`getPageMarks`, `addPageMark`, `deletePageMark`) immediately redirect the viewer to `/${locale}/mushaf?removed=1` where the generic `AccessRemovedBanner` is displayed (ADR 0012).
- **Personal widget isolation:** `PlansWidget` (personal daily awrad tracker) is gated on self-reader routes only and suppressed on `/mushaf/[grant]/pages/*` so the viewer's own daily awrad are never displayed over another user's mushaf.
- **Implementation:** the self and grant readers share one server component, `app/components/reader/ReaderPage.tsx` (params `basePath` + optional `grantId`) — the self `pages/[id]/page.tsx` keeps `generateStaticParams`; the grant `mushaf/[grant]/pages/[id]/page.tsx` omits it (dynamic). Sidebar/search links (`SurahListItem`, `RubList`, `SearchQueryResults`) derive the prefix at render time from `useReaderBasePath()` (reads the locale-less pathname) rather than prop-threading — this is why they stay grant-aware even though `SearchBar` lives in the global nav above the grant layout. Don't reintroduce hardcoded `/pages/...` hrefs in those components.

---

## Verse/Word Comments

**Status:** active

> **SUPERSEDED by [ADR 0025](../adr/0025-mark-is-category-plus-comment.md) / "A Mark Is a Category Plus an Optional Comment" below.** Comments are no longer an independent `mark_type: "note"` row — they are an optional `comment` column on the single mark row. The `dir="auto"` free-text rules below still apply.

**Decision:** Comments are a new `Mark.mark_type: "note"` value, not a new model — `mark_value` is widened from `VARCHAR(191)` to `@db.Text` to hold free text. See [ADR 0053](../adr/0053-verse-word-comments-as-mark-type.md).

**Constraints:**
- The generic `upsertMark`/`deleteMark`/marks API routes/`getPageMarks`/`useMarks` require no changes — they already parameterize over `mark_type`.
- A word/verse can carry an independent `"color"` mark and `"note"` mark simultaneously (separate rows under the same unique key shape), each with its own author. Any UI showing "Marked by X" attribution must read it **per `mark_type`**, never once for the whole word/verse — `MarkModal`'s Bookmarks and Notes tabs each show their own author independently, since a shared-mushaf color and note on the same spot can come from different people.
- A verse-level note (added via the end-of-verse marker, same trigger as verse color marks) reuses the existing mechanism where `marks[verse_key]` is spread onto every word in that verse (`QuranLine`) — no separate code path for "note belongs to a verse vs a word."
- No hover tooltip — the reader shows only a `border-b-2 border-dotted border-primary` indicator on any word carrying a note; reading/editing the comment happens in `MarkModal`'s Notes tab (same click/tap that already opens the modal for color marks).
- `/api/marks` (My Marks page) fetches both `"color"` and `"note"` mark types; `MyMarksList` buckets by `mark_type`, not by color key alone — a word/verse with both a color and a note appears once in its color tab and once in the new Notes tab, since they are independent `Mark` rows.
- Comment text (the Notes tab `<Textarea>`, the My Marks comment preview) uses `dir="auto"`, not the locale-locked `dir={getLanguageDirection(locale)}` pattern every other RTL-sensitive element in this codebase uses — free-form user text should render by its own content direction (an `ar`-locale user can write an English note and vice versa). Every other element (UI chrome, Quran text) keeps the existing locale-locked or Quran-text-locked convention; do not spread `dir="auto"` beyond actual free-text user content. Form controls (`input`/`textarea`/`select`) do not reliably inherit `direction` from an ancestor `<html dir>` in this codebase's experience — always set `dir` explicitly on them, never rely on inheritance.
- When a container's `dir="auto"` is meant to auto-detect direction from a specific text-bearing descendant (e.g. the My Marks note box — a flex row with an icon + comment text, where the icon's side should flip with the comment's language), **do not also put `dir="auto"` (or any explicit `dir`) on that descendant.** Per the HTML living standard, an element's `dir="auto"` scan for the first strongly-typed character explicitly **excludes the text of any descendant that has its own `dir` attribute** (that descendant is treated as its own bidi context). Two `dir="auto"` on both container and descendant means the container's scan finds nothing (skips the only text-bearing child) and always resolves to `ltr`, regardless of actual content — confirmed live via `getComputedStyle` (`docs/plans/verse-word-comments.md` Addendum 4). Put `dir="auto"` on exactly one element in the chain — the outermost one whose layout should react to the content — and let plain (non-form-control) descendants inherit the resolved `direction` via normal CSS inheritance.

---

## Color Marks Are Semantic Categories

**Status:** active

**Decision:** A mark stores a stable **category key** (`forgetting`, `similar`,
`tashkeel-error`, `tajweed-error`, `linking`, `other`), not a color. The display
color is **derived** from the category via a single `MARK_CATEGORIES` table
(`app/constants/marks.ts`) — color is never persisted. See
[ADR 0024](../adr/0024-color-marks-encode-category.md).

> **Amended by [ADR 0025](../adr/0025-mark-is-category-plus-comment.md) below:** the
> category is stored in a dedicated `category` column (not `mark_value`), and
> `mark_type` is dropped — a mark is one row (category + optional comment). The
> category → color derivation and the fixed-constant / literal-Tailwind rules
> below are unchanged.

**Constraints:**
- The unique key `[marked_type, marked_id, to_user]` (per ADR 0025) allows one
  category per spot per mushaf (a word/verse is a single classification).
- The category set is a fixed app-side constant, not a DB model/FK — a
  cross-domain FK would break the DB split (ADR 0008). New categories are added
  by extending `MARK_CATEGORIES`.
- Two class sets are keyed by the same category key and must stay in sync:
  the **solid** picker/My-Marks chip classes live in `MARK_CATEGORIES`; the
  **translucent** on-page highlight classes live in `highlight.ts`
  (`HIGHLIGHT_COLORS`, keyed `${categoryKey}-mark`). Both must be **literal**
  Tailwind class strings (never interpolated) so JIT emits them.
- The render path must fall back to **no highlight** for any unrecognized
  `category` — legacy `red`/`blue`/`green` rows are unknown keys. No data
  migration is written (test data is disposable); do not add one.
- `highlight.ts`'s `HighlightType` union mixes two different meanings under one
  type: the `${categoryKey}-mark` keys (`forgetting-mark`, `linking-mark`, etc.)
  are colors for a **persisted** `Mark.category`, while `search`/`selection`/
  `last-read` are **ephemeral, URL-param-driven** pointers with no DB row
  behind them. Never reuse a `-mark` key for a temporary "point at this verse"
  link (e.g. a shared-verse deep link) — it would make that temporary state
  visually indistinguishable from someone's actual saved mark of that category
  on an unrelated verse. Use `selection` (or add a new non-`-mark` type) for
  anything that isn't backed by a real `Mark` row. Found via `docs/plans/copy-share-verses.md`'s share-verse deep link, which initially picked `linking-mark` by mistake.

---

## A Mark Is a Category Plus an Optional Comment

**Status:** active

**Decision:** A `Mark` is **one row per spot per mushaf** carrying a required
`category` (VARCHAR, the ADR 0024 key) and an optional `comment` (`String? @db.Text`,
`null` when absent). `mark_type` and `mark_value` are **dropped**; the unique key
is `[marked_type, marked_id, to_user]`. A comment cannot exist without a category
— the `other` category is the comment-only escape hatch. See
[ADR 0025](../adr/0025-mark-is-category-plus-comment.md) (supersedes ADR 0053,
amends ADR 0024).

**Constraints:**
- One `from_user` per mark (last-author-wins on a shared mushaf) — the
  per-`mark_type` split authorship of ADR 0053/0012 is gone. "Marked by X" is
  shown once per mark, not per field.
- The modal is a single flow (no Bookmarks/Notes tabs): category picker + a
  comment textarea disabled until a category is selected. Save writes both;
  Remove deletes the whole row.
- Reader page shows the category highlight only — **no on-page comment
  indicator** (the old dotted-underline note cue is removed).
- My Marks buckets by category only; a row renders its `comment` preview inline
  when present. The `dir="auto"` free-text rules (Verse/Word Comments section
  above) still govern the comment textarea and preview.
- Schema reshape via `prisma db push` on disposable data — no migration script.

---

## Marks Are Local-First

**Status:** active

**Decision (2026-09-04):** Marking works offline and without an account. A client store
(`localStorage`, via `app/utils/storage.ts`) is **the read source of truth for the UI**;
the server stays the durable source of truth for the data. Sync is **state-based, not
operation-based**: one local record per marked spot holds its desired current state, and
that state is pushed — `upsertMark`/`deleteMark` are already idempotent and keyed by
`[marked_type, marked_id, to_user]`, so replay is order-independent. Every record is
either `synced` (a disposable mirror of a server row) or `pending` (an unacknowledged
intent). A sync run pushes, then pulls. Writes to a **grant** mushaf remain online-only.
Supersedes the marks clause of ADR 0014 for the self mushaf. See
[ADR 0061](../adr/0061-offline-first-marks-sync.md).

**Constraints:**
- **A pull never overwrites a `pending` record**, and `synced` records are freely
  overwritten. This one rule is what makes the design safe; inverting it either loses
  unpushed work or freezes stale local state forever.
- **Deletes are tombstones** (`deleted: true`, `pending`) until the server acks, then the
  row is dropped. Removing the local row instead lets the next pull resurrect the mark
  from the server — the delete is silently undone.
- **Push before pull in a run**, so the pull observes post-push state and the two cannot
  disagree within a run.
- **A push carries the record's client `updated_at`; `upsertMark` skips the write when the
  existing row's `client_updated_at` is newer.** Compare client clock to client clock — a new
  nullable `Mark.client_updated_at` column (Prisma migration, ADR 0051), *not* `Mark.updated_at`,
  which `@updatedAt` writes from the server's clock. Comparing the two makes any device whose
  clock runs slow permanently unable to sync: a silent, total failure, worse than the clobber
  the guard prevents. `null` counts as older than anything, so a first push always beats a
  legacy row. The losing device is corrected by the pull that follows its own push, so it
  self-heals rather than needing an error path. Without the guard at all, a device offline for
  a week silently clobbers a newer edit made meanwhile on another device. Cross-device clock
  skew remains — that is inherent to last-write-wins and is accepted.
- **Local records denormalize `snippet`, `chapter_name_simple`, `chapter_name_arabic` and
  `verse_number`**, captured in `MarkModal` at creation time. `/api/marks` builds these
  server-side from `quranPrisma`; a guest has no session and an offline user has no
  server, so My Marks cannot render without them.
- **The owner stamp is sticky and evidence-based — never derived from `useSession()`.**
  next-auth reports **unauthenticated** whenever the `/api/auth/session` fetch fails or is
  aborted (`app/sw.ts` bounds it at 3s, ADR 0049 — see the Auth section in
  [`api.md`](api.md)), so every offline launch looks signed-out. Only an observed sign-in or
  an explicit sign-out moves the stamp; an unauthenticated reading with a *failed* session
  fetch means "unknown", and the last stamp stands. Deriving it from live session state
  re-stamps the store to `"guest"` offline and then trips the different-owner reset on
  reconnect, discarding exactly the offline marks this design exists to protect. Guest-facing
  UI (the `MarkModal` prompt, the `/marks` line) gates on the stamp for the same reason.
- **Sign-out flushes pending marks and confirms when any remain** ("You have N marks that
  haven't synced yet" — Sign out anyway / Stay and retry). This is online-only by
  construction: `UserMenu` renders Sign out only when `session` is truthy, so offline it shows
  Sign in and the path is unreachable. Both `signOut()` call sites in `UserMenu` must route
  through it.
- **The store is stamped with an owner** (`"guest"` or the user id). Signing in re-stamps a
  guest store to that user (its records are all `pending`, so the ordinary push loop *is*
  the guest→account migration — do not write a separate migration path). Signing in with
  an id **different** from the stamp resets the store and pulls fresh: pushing the previous
  account's pending marks would graft one person's annotations onto another's account.
  Sign-out flushes pending while still online rather than wiping the store — the installed
  PWA is a single-owner device.
- **`useMarks` reads two different sources, and the split is `grantId`.** The self mushaf reads the
  local store via `useSyncExternalStore` and issues **no** network request at all; `grantId` set keeps
  the React Query server fetch. Both hooks are called unconditionally so hook order never depends on
  `grantId` — the query is gated with `enabled: Boolean(grantId)`, not by branching around the call.
  The `LocalMark` → `PageMark` adapter runs in a `useMemo`, never inside `getSnapshot`, which must keep
  returning one stable reference. On the self mushaf every mark is the reader's own, so the adapter
  sets `is_own: true` and `author_name: null` — `QuranSafha` passes `authorName` to `MarkModal`, and
  "Marked by" must never appear over your own mark. Tombstoned records (`deleted: true`) are filtered
  out so a delete looks immediate while the row stays for the sync engine to push.
- **`reload()` survives for the grant reader only.** Removing it wholesale (as `#548`'s plan first
  said) would have broken refresh-after-write on the shared mushaf, which is still React Query-backed
  and has no other refresh path. `MarkModal` routes through one helper: `grantId` → `reload()`, self →
  a best-effort `syncMarks()` that pulls the server write back into the store. `#550` replaces the
  self branch with a direct store write.
- **`grantId` is the offline cut-off.** When `MarkModal` has a `grantId`, it keeps today's
  offline-disabled behaviour and never touches the local store. ADR 0014's rejection of
  offline mark writes was about concurrent viewers of a shared mushaf under
  last-author-wins (ADR 0012); that hazard is real and is not superseded.
- **RESOLVED (#548, 2026-09-06) — `useSyncExternalStore` is safe for the marks read path.** The Font
  System decision in [`rendering.md`](rendering.md) lists it among the mechanisms *tried and abandoned*
  for `QuranSafha`'s `fontReady` because "RSC navigation calls `getServerSnapshot` on the client",
  which for marks would mean the empty server snapshot blanking highlights. Measured on the real
  reader before wiring anything: `getServerSnapshot` is called **only during initial SSR hydration**
  and **never** on a soft RSC navigation into the reader, on back/forward `popstate`, or on the pager
  commits that mount new panels (0 calls in all three, against 114–228 `getSnapshot` calls). The
  `fontReady` finding does not generalize to a store-backed subscription. Highlights therefore survive
  every in-app navigation; do not re-litigate this without new measurements.
- **One mark write re-renders every mounted panel exactly once, and does not touch the font path.**
  Measured with all panels subscribed: a store mutation re-renders all 6 mounted `QuranSafha` panels
  once each (no cascade, no loop) and triggers **0** `document.fonts.check` calls — `fontReady` is
  `useState` and does not depend on marks, so a mark write cannot re-run the font-readiness gate or
  flash a skeleton. Subscription granularity (a per-page selector, a `markPages`-keyed snapshot) was
  therefore **not** needed and must not be added speculatively — it would be complexity with no
  measured problem behind it.
- **`localStorage`, not IndexedDB**, and deliberately so. Marks can never be in the SSR HTML
  (user state on a statically-generated page; `useSyncExternalStore` uses `getServerSnapshot`
  through hydration), so highlights land on the **first client commit after hydration** — a
  synchronous store makes that one commit, IndexedDB adds an async hop that pushes them a
  further frame out, the class of flash ADRs 0028/0034 exist to prevent. The store is bounded
  (~150 bytes/mark; 5,000 marks ≈ 750 KB), the codebase has no IndexedDB or `idb`
  dependency, and the `storage` event gives cross-tab coordination for free (the mechanism
  `app/lib/tafsir/download-manager.ts` already uses). Serialize the map once per mutation,
  never per render — `localStorage` writes block. Everything goes through one store module,
  so moving its internals to IndexedDB later is contained.
- **The sync run never fires from a mount `useEffect`.** The launch trigger is deferred off
  the critical path (idle after first paint) and gated on a signed-in owner stamp — an
  unconditional mount fetch in anything the root layout renders is exactly what ADR 0049's
  Root-Layout Network Budget forbids (see [`pwa.md`](pwa.md)).
- **The store's `getSnapshot` must return a stable object reference** until a mutation.
  Re-parsing `localStorage` per call returns a fresh object every time and sends
  `useSyncExternalStore` into an infinite re-render loop.
- **Writes must handle `QuotaExceededError` explicitly with snapshot rollback.** `storage.set`
  swallows failures with a `console.warn` by default to protect pre-existing callers, but accepts
  `{ throwOnQuota: true }` so marks operations can surface quota exhaustion. When thrown, the
  in-memory snapshot (`marksSnapshot` / `ownerSnapshot`) must roll back to the pre-mutation state
  to prevent memory from diverging from disk.
- **`/api/quran/pages/{id}/marks` and `/api/marks` must be `NetworkOnly` in `app/sw.ts`,
  registered ahead of `...defaultCache`.** `defaultCache` caches every same-origin `GET /api/*`
  for 24h (`NetworkFirst`, `cacheName: "apis"`, `maxEntries: 16`, `networkTimeoutSeconds: 10`),
  so without this rule an offline or slow pull receives a stale cached `200`, writes a day-old
  snapshot into the store as `synced`, and reports a successful reconciliation it never made —
  rolling back synced marks and resurrecting ones deleted elsewhere. A pull must reach the
  network or fail; failing is safe, because the store already holds the last known state. Same
  pattern and same class of reason as the QDC tafsir `NetworkOnly` rule (ADR 0060).
- **Guest marks are single-copy, so the store requests `navigator.storage.persist()`.** Every
  other offline feature in this app can heal from the server; a guest's marks cannot. Two
  WebKit mechanisms delete local data and only one exempts installed PWAs: ITP's 7-day
  script-writable-storage cap exempts home-screen web apps (they keep their own counter of days
  of use), but quota/storage-pressure eviction does not — that is the same LRU mechanism behind
  ADR 0060's `verifyAndHeal`. `navigator.storage.persist()` is granted on heuristics "like
  whether the website is opened as a Home Screen Web App" (Safari 17+), and a persistent-mode
  origin is excluded from eviction. Request it before enabling guest marking. It is a request,
  not a guarantee, so `verifyAndHeal` stays. A guest in a **plain Safari tab** is covered by
  neither mechanism, which is why **guest marking is gated to `isStandaloneDisplayMode()`**
  (2026-09-04) — the same gate offline recitation and offline tafsir use. Offline marking for
  *signed-in* users is not gated this way; their marks have a server replica.
- **A 401 is not a sign-out.** It stops the run and raises a "session expired, sign in to sync"
  state in My Marks; it never moves the owner stamp and never drops records. Without it, a
  session expiring mid-use leaves marks that look saved and silently never sync.
- **A `422` push is dropped and logged, not retried forever**, and surfaces in My Marks —
  never in the reader. Sync state is shown only when a mark is *not* synced; no per-mark
  sync badges over scripture.
- **The sync engine (`app/lib/marks/sync.ts`) coordinates push-then-pull sync as a module singleton.**
  In-flight deduplication guarantees that concurrent triggers share the same run without double-pushing.
  Exposed via `useSyncExternalStore`, coordinating across tabs via the native `storage` event.
- **The engine is inert until something subscribes to it, and `MarksSync` is that something.**
  `sync.ts` attaches every trigger it owns — `online`, `visibilitychange`, cross-tab `storage`, and
  the store-mutation listener that raises the guest→account migration — inside `subscribe()`, on the
  first listener; and its deferred launch trigger runs at module evaluation, so it needs the module
  to be *imported* by something in the bundle. Nothing else calls `setOwnerStamp` either, and
  `executeSync` returns early for a `"guest"` stamp. All three are wired by one null-rendering leaf,
  `app/components/marks/MarksSync.tsx`, mounted in `app/[locale]/layout.tsx` beside `LastReadPageSync`.
  This is recorded because it was missed: `#546` and `#547` both shipped as modules nothing imported,
  so the store was never populated, no trigger ever attached, and every unit test passed
  regardless — the failure is invisible from inside either module (`#560`).
