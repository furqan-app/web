---
title: Add Quran Recitation Playback with Reciter Selection
type: feature
date: 2026-07-10
status: implemented
area: recitation
adr: [0021, 0056]
---

# Add Quran Recitation Playback with Reciter Selection

## Summary

Listen to full-Quran recitations while reading along. A reciter picker (backed by QDC's live reciter list) lets users choose any available reciter. Playback starts from a "listen" entry point on the reader or "play from here" in `MarkModal`, plays continuously — **chaining across chapters** — highlights the exact word being recited (word-level, karaoke), and while *attached* auto-advances the reader across page boundaries. Practice controls (stop point, per-ayah repeat, whole-range repeat, speed, pause-between-repeats, a "Start From" scope) live in a settings sheet with a draft model.

Playback has **one app-wide lifecycle** ([ADR 0056](../architecture/adr/0056-recitation-global-playback-and-detachable-follow.md)): it ends only when the user stops it, its range finishes, or a hard error kills it. No navigation — page swipe, arrows, keyboard, sidebar/search jump, top-level route switch, closing the reader — ever stops it. See [ADR 0021](../architecture/adr/0021-recitation-playback.md) for proxying QDC at runtime and driving navigation from the audio timeline.

## Approach

### Data + context

QDC (`api.qurancdn.com`) serves one audio file per chapter with per-verse and per-word (`segments`, millisecond) timing. It is **proxied** through internal API routes (our `jsonResponse()` envelope) — never called from the client. The provider layer (`app/lib/recitation/qdc-provider.ts`) is the single place QDC's wire shape is normalized (`Addendum 2` — no registry/factory, one provider). `RecitationContext`, mounted once in `app/[locale]/layout.tsx`, owns the `<audio>` element, the selected reciter (persisted to `localStorage`), play/pause state, the loaded chapter's verse timings, and the practice settings. It survives all client-side navigation because it is mounted above the reader route tree.

### Word highlight — by attribute, no registry

`QuranWord` renders `data-fq-word={word.location}` and **does not consume `RecitationContext`** (~600 word components no longer subscribe to a per-word-ticking context). The highlighter resolves targets with `document.querySelectorAll('[data-fq-word="…"]')` at the moment the active word *changes* (~2–4×/second, not per `timeupdate` tick) and toggles the class on **every** match — duplicates and hidden partner copies included (the hidden one is `display:none`, harmless; the visible one is always correct). No bookkeeping to go stale.

`qdc-provider.ts` types wire `segments` as `number[][]` and drops any entry that is not exactly three numbers (QDC really serves malformed 1- and 2-element segments). When `findActiveWordLocation` returns `null` (an inter-word gap, or ~55ms of verse-boundary skew where segment times cross verse windows), **hold the last highlight** — only `stop()` / `clearHighlight()` clears.

### Follow — a two-state attach/detach machine

`RecitationContext` owns a single `isFollowing: boolean`. All transitions are decided inside the `RecitationFollow` **leaf** via the pure `decideRecitationFollow` — **`ReaderPager` gains no `useRecitation()` call** (the ~4Hz / per-verse re-render firewall, ADR 0028, holds).

| From | Trigger | To |
|---|---|---|
| any | recited page is in the visible window (returned, or swiped back onto it) | attached |
| fresh session, start page not on screen (`prevRecitedPage == null`) | — | `onFollow` pulls the reader to it, then attaches |
| attached | `recitedPage` moved, anchor did not (auto-advance crossed a boundary) | stays attached, `onFollow` fires |
| attached | visible window changed under the reader (double-view toggle, breakpoint) | stays attached, `onFollow` fires |
| attached | anchor moved, `recitedPage` did not (a clean manual navigation) | **detached** — the reader does not snap back |
| attached | `RecitationFollow` unmounts (left the reader route) | detached |
| — | `stop()` / a failed `play()` | `isFollowing` reset `false` |

`onFollow` is routed through the pager's guarded `followTo`/`commitTo` — navigation stays owned by the pager (ADR 0028); the leaf never navigates directly. Auto-advance follow across page boundaries **while attached** is unchanged.

### The return affordance — `RecitationReturnStrip`

The way back to a detached recitation **never floats over content**. It is **a second row of the nav** — a new client component rendered as the last child inside `<nav>` (`app/components/nav/Nav.tsx`), consuming `useRecitation()` / `useReaderNavigation()` itself (so a per-verse `currentVerseKey` change re-renders only the strip, not `Nav`). It carries the combined `returnToRecitedVerse` string + play/pause + Stop, toggles `.fq-recitation-strip-open` on `<html>` while mounted. On mobile/tablet it toggles with the nav overlay; on desktop and every non-reader route it pushes content down (`--fq-nav-extra` 0 → 2.75rem, subtracted from the desktop-reader `.fq-reader-outer` and non-reader `main` `min-height` so a short page stays exactly one screen).

`RecitationPlayerBar` renders **reader-route only** (verse-key line → `recitedVerseLabel` at `text-[10px]`); the full bar is never shown off-reader.

### Stop points + cross-chapter chaining

`stopPoint`: `page | surah | rub | hizb | juz | none | custom`. The `surah` target is synchronous (last entry of the loaded `verseTimings`); `page`/`rub`/`hizb`/`juz` resolve via `GET /api/quran/verses/[verseKey]/stop-point?scope=…` (plain Prisma route — **`findFirst`, never `findUnique`**: `Verse.verse_key` is not `@unique`; scope validated with `Object.prototype.hasOwnProperty.call`, not `in`); `none` is the hardcoded `114:6`; `custom` is a page or verse target (`CustomRangePicker`).

Because a hizb/rub/juz/`none` boundary — and even a `page` that spans a surah boundary (page 106: `4:176` then `5:1`–`5:2`) — routinely falls in a **later chapter**, `RecitationContext` auto-continues into the next chapter's audio when the loaded one ends (real `"ended"` detection was added — there was none before, and `findActiveVerseTiming`'s clamp meant the literal last verse's stop/repeat never fired). `decideChapterEnd` (pure helper) decides apply-stop-logic / chain-to-next (`chapterId + 1 ≤ 114`) / natural-end, and **excludes `none` from ever repeating a range**. `loadChapter(reciterId, chapterId, seekVerseKey?)` is the shared "fetch audio+pages → update refs → set `audio.src`/`currentTime` → `play()`" helper used by `chainToNextChapter` and the range-repeat seek-back reload. `scheduleSeek`'s `pauseMs === 0` branch always calls `audio.play()` (it is called from `handleChapterEnded` where the audio is paused).

### Settings sheet — draft model + Start From (Addendum 12)

`RecitationSettingsSheet` holds a `draft: RecitationSettings` seeded from committed `settings` on each open; every control reads/writes the draft, and **nothing touches global state or localStorage until the sticky-footer CTA** ("Start Recitation" when idle → commit + `play(resolvedStartVerseKey)`; "Apply Changes" when playing/paused → commit + mid-session re-resolution, and seek to the drafted Start From if it differs, D3). Closing via the header X / back gesture **discards the draft** (`useCloseOnBackGesture` contract preserved, ADR 0055). The two reciter triggers on `RecitationPlayerBar` itself stay instant-commit; bar quick-play always starts at the current page's first verse and never consumes a stored start point.

- **Start From** section, directly above "Stop at" (reads as one range unit): presets `Current Verse` (default while playing/paused) / `Current Page` / `Start of Surah` / `Start of Rub'` / `Custom`. **Per-session, derived on every open, never persisted** (no localStorage key). `Start of Rub'` needs `?scope=rub-start` on the stop-point route (`findFirst({ orderBy: { id: "asc" } })` on the ref verse's rub). `start ≤ end` is enforced by **mutual push-apart** — editing Start past End raises End, lowering End below Start lowers Start — never an error state or disabled Apply. Equality allowed. Start `1:1` + Stop `none` is legal.
- **Per-ayah repeat cycle button** in `fq-rail-utils` (bar form) / stacked above the gear (rail form), visible whenever the bar renders: cycles `perAyahRepeatCount` `1 → 2 → 3 → ∞ → 1`. Mid-verse tap resets `perAyahRepeatsDoneRef` only (no seek — the in-flight pass counts as rep 1). Allowed during override sessions (per-ayah repeat stays user-owned).
- The `activeOverride` read-only banner and its disabling of the Stop-at `RadioGroup` / `CustomRangePicker` / Repeat-whole-range stepper carry over (gating now applies to draft writes) — see `listening-wird-inline-playback.md`.
- Sheet UI (Addendum 5b): stop-point is a `grid grid-cols-2` of pill `label`s wrapping `sr-only` `RadioGroupItem`s (one lucide icon each); the reciter list is a `Popover` + `Command` combobox; section headers carry a small `text-primary` lucide icon; grouped surfaces are `rounded-xl border border-border bg-card p-3`.

### "Play from here"

`MarkModal`'s "play from here" is a **single instant-play button** — it does **not** open the settings sheet (Addendum 6 removed `openSettings(startVerseKey)` as dead code; it is not reintroduced). `MarkModal` gets no second recitation button (Addendum 12 #394's original MarkModal scope was dropped).

## Decision Tree / Algorithm — page-follow (per `timeupdate` tick, while attached)

| Condition | Action |
|---|---|
| recited word's verse/word-index unchanged | no-op |
| recited word moved within the same verse | update highlight only (`document.querySelectorAll` toggle, no React re-render) |
| recited verse's page is in the visible set (`{currentPageId}` single / `{rightPageId, leftPageId}` double) | highlight only, no navigation |
| recited verse's page is **not** in the visible set | `onFollow` → pager `followTo` (never `getNavigationHref`/`getPairNavigationHref` — those encode locale-flipped *visual* direction, not reading order; reading order is always `page_number` ascending) |
| loaded chapter's audio ends | `decideChapterEnd`: apply stop/repeat logic, or `chainToNextChapter`, or natural end at `114:6` |
| user manually navigates while playing | audio keeps playing on its own timeline; the leaf **detaches** (no snap-back) and the return strip appears |
| user leaves the reader route | `RecitationFollow` unmounts → detached; playback continues; return strip is the second nav row |

## Verified Test Cases

- **Route leave keeps playback.** Play on p1 → tap Home/Marks → audio still playing, player bar gone, return strip is a second nav row with "back to page 1" → tap Return → lands on `/pages/1`, follow attached.
- **Page away → no snap.** Play on p1 (stopPoint "page") → Next arrow → still on p2 after 1s → return strip appears → tap Return → back on p1, attached → cross into p3 → follows.
- **Auto-advance still follows while attached.** Play mid-p2, stopPoint "surah", cross into p3 → reader advances, no return strip.
- **Play from a mark on another page still pulls the reader** — `play("N:…")` where N's page ≠ current → navigates to it (attached).
- **Off-reader session start is controllable.** Start a listening wird from `/plans` → go Home → strip visible, never auto-attached; Stop and Return both work.
- **Nothing floats over content.** Non-reader route with the strip up: a short page stays exactly one screen; a long page's last row is never covered. Mobile/tablet reader: the strip slides off with the nav overlay and back.
- **Juz 1, start 1:1:** `scope=juz` → `{2:141, ch 2}`; ch 1 plays to end → chain to ch 2 → stop at 2:141. **`none` from 2:5:** chains ch 3…114, `stop()` at 114:6. **`page` page 106, start 4:176:** `scope=page` → `{5:2, ch 5}`; ch 4 → chain ch 5 → stop 5:2.
- **Whole-range repeat, stopPoint "surah", rangeRepeat 2, start 1:1:** reaches 1:7 → `seekToRangeStart` seeks to 1:1 **and sets `currentVerseKeyRef.current = "1:1"`** → next tick `isStopVerse` false → plays forward again → second 1:7 → `stop()`.
- Draft: open sheet playing 2:100, draft Start 2:255, Apply → seeks, counters reset, continues. Dismiss via back gesture → committed settings byte-identical, playback untouched.

## Files to Change

- `app/api/quran/recitations/reciters/route.ts`, `app/api/quran/recitations/[reciterId]/chapters/[chapterId]/route.ts`, `app/api/quran/chapters/[chapterId]/verse-pages/route.ts` — QDC proxies + verse→page map.
- `app/api/quran/verses/[verseKey]/stop-point/route.ts` — `?scope=page|rub|hizb|juz|rub-start`, plain Prisma, `findFirst`.
- `app/lib/recitation/qdc-provider.ts` — the single QDC normalization layer (segment 3-tuple filtering).
- `app/contexts/RecitationContext.tsx` — `<audio>`, reciter (persisted), settings, `stopVerseKeyRef`/`stopChapterIdRef` (resolved async in `play()` and the stop-point-changed effect, against `currentVerseKeyRef` falling back to `startVerseKeyRef`); real `"ended"` detection → `decideChapterEnd`/`chainToNextChapter`/`loadChapter`; `seekToRangeStart` sets `currentVerseKeyRef` on the same-chapter branch; `isFollowing` state (not persisted; `play()` publishes `recitedPage` synchronously but does **not** force `isFollowing`; `stop()` + failure path reset it); `resetPerAyahRepeat()`; apply-time seek-to-drafted-start; Start From resolution helpers. **No** `rangeProgress`/`perAyahProgress` (Addendum 12 #394 badge deleted; `perAyahRepeatsDoneRef`/`rangeRepeatsDoneRef`/`resolveRepeatTarget` stay).
- `app/components/reader/RecitationFollow.tsx` — the attach/detach machine (thin wrapper over `decideRecitationFollow`; keeps `prevRecitedPage` stale on a follow; unmount → detach).
- `app/components/recitation/RecitationReturnStrip.tsx` — **new**; the second nav row.
- `app/components/nav/Nav.tsx` — render `<RecitationReturnStrip />` as the last child of `<nav>`.
- `app/components/RecitationPlayerBar.tsx` — reader-route-only render gate; `recitedVerseLabel`; per-ayah repeat cycle button; no hard stop, no #394 badge.
- `app/components/RecitationSettingsSheet.tsx` — draft model + sticky-footer CTA; Start From section + push-apart; stop-point pill grid; reciter combobox (`Popover` `container` = the sheet's own `SheetContent` node — the reusable nested-Popover-in-Sheet focus-trap fix, Addendum 5b); grouped surfaces.
- `app/components/MarkModal.tsx` — a single instant "play from here" button (no `openSettings`).
- `app/components/QuranWord.tsx` — `data-fq-word={word.location}`; drop `useRecitation()`.
- `app/utils/recitation.ts` — `decideChapterEnd`, `decideRecitationFollow`, `recitedVerseLabelParts` (+ tests).
- `app/hooks/use-is-reader-route.ts` — **new**; extracted `pathname.includes("/pages/")` predicate (now render-decision-load-bearing, ADR 0056); `RecitationPlayerBar`/`Nav`/`PlansWidget` migrated onto it.
- `components/ui/popover.tsx` — `container` prop on `PopoverContent` (forwarded to the Portal) — the reusable Dialog/Sheet-nested-Popover fix.
- `app/globals.css` — `--fq-nav-extra`; `.fq-recitation-strip-open`; the settings-sheet / cycle-button styling.
- `messages/{en,ar}.json` — reciter/stop-point/Start-From/cycle/CTA keys; `recitation.recitedVerseLabel`, `recitation.returnToRecitedVerse`; **removed** `recitation.rangeProgress*`.
- `docs/architecture/adr/0021-recitation-playback.md` (+ its 2026-07-16 no-cross-chapter and 2026-08-03 highlight addenda, and the note that Addendum 10's hard stop is superseded), `adr/0056-…`, `docs/architecture/DECISIONS.md`.
- `e2e/tests/recitation-lifecycle.spec.ts` — **new** (route-leave, page-away, return, stop, pause/resume, mobile overlay-toggle; recitation APIs + a silent-WAV data URI stubbed via `page.route`).

## Constraints

- **`ReaderPager` gains no `useRecitation()` call** — the ~4Hz / per-verse re-render firewall (ADR 0028) holds. All follow logic is in the `RecitationFollow` leaf; `Nav` itself must not consume `useRecitation()` (the strip subcomponent does).
- Word-highlight updates use a direct `document.querySelectorAll` toggle on `data-fq-word`, not React state driving re-renders; the query runs only when the active word changes, not per tick.
- `onFollow` is always routed through the pager's guarded `followTo`/`commitTo` — the leaf never navigates directly. Navigate by exact `page_number` (ascending), never through the locale-flipped `getNavigationHref`/`getPairNavigationHref`.
- Auto-advance follow across page boundaries **while attached** is unchanged.
- Do not pause or sync playback to any navigation — audio always runs on its own timeline.
- QDC is a **runtime** dependency (ADR 0021) — proxied, never called from the client, never seeded. New QDC routes use `jsonResponse()` under `app/api/quran/…`. The stop-point route is DB-only and needs no provider adapter.
- `Verse.verse_key` is not `@unique` — always `findFirst`, never `findUnique`. Validate a `?scope` param with `hasOwnProperty`, not `in`.
- `decideChapterEnd` must exclude `stopPoint: "none"` from ever repeating a range. `scheduleSeek`'s `pauseMs === 0` branch must always call `audio.play()`.
- Draft: nothing writes global state / localStorage until the footer CTA; discard on close must leave localStorage byte-identical; Start From is never persisted. Override semantics unchanged (still bypass `resolveStopTarget`; sheet gating during overrides applies to draft edits). Addendum 9's play-time guard (`resolveStopTarget`'s behind-chapter fallback) must keep working unchanged even though the draft breaks display==committed inside the open sheet.
- Progress/repeat state updates only on verse/repeat changes, never per tick.
- `useCloseOnBackGesture` (ADR 0055) and the Popover-in-Sheet `container` contract are preserved through every sheet refactor.
- Rail invariants (Desktop Reading Group / ADR 0021): new controls join `fq-rail-utils`; no zone restructuring, no width change.
- `isFollowing` is session state, not persisted. Practice-config reset on `stop()` is unchanged.
- The strip's return link uses the `<Link href={/pages/N}> + onClick → jumpTo(N)` client-handoff pattern (a known-duplicated pattern — extracting a shared `<ReaderJumpLink>` is a noted follow-up).

## What NOT to Do

- Do **not** seed audio/timing data or add Prisma models for this (ADR 0021 Option A, rejected); do **not** call QDC directly from client components (Option B, rejected).
- Do **not** scope the reciter list to a curated few — the full live QDC list was chosen. Do **not** ship ayah-only highlighting as the final state — word-level was chosen.
- Do **not** stop/pause playback when the user leaves the reader route (Addendum 10's hard stop is **superseded** by ADR 0056), or snap the reader back to the recited page on a clean manual navigation (the forced follow-snap is **superseded** by the attach/detach machine).
- Do **not** add follow/detach state to `ReaderPager` or make it (or `Nav`) consume `RecitationContext`; do **not** reintroduce a per-word context subscription anywhere.
- Do **not** let any recitation surface float over content — the return strip is a nav row backed by reserved space (`--fq-nav-extra`); do **not** put the return affordance in `RecitationPlayerBar` (an earlier iteration did — too easy to miss, hidden with the bar on mobile/tablet). Do **not** show the full `RecitationPlayerBar` off-reader.
- Do **not** add cross-chapter auto-continue as a special-case on top of the old "no auto-continue" restriction — that consequence is formally superseded (ADR 0021 Addendum 2026-07-16); every stop scope must resolve into a later chapter. Do **not** add a registry/factory for stop-point scopes or QDC providers — one endpoint with a `scope` param, one provider.
- Do **not** touch `MarkModal` for a second recitation button, or reintroduce `openSettings(startVerseKey)`.
- Do **not** persist Start From; do **not** let bar quick-play consume a stored/drafted start; do **not** make the bar's reciter triggers draft-based or remove them.
- Do **not** validate ranges with error states or a disabled Apply — mutual push-apart only. Do **not** restart audio / seek when a committed draft's Start From equals the current position.
- Do **not** gate the reader route check anywhere but `use-is-reader-route.ts`.
- Do **not** touch the cross-chapter `loadChapter` branch to "also fix" the same-chapter repeat bug — it was already correct.

## Decisions Made

- Audio/timing: QDC, proxied at runtime; one provider, no registry.
- Playback is continuous and chapter-spanning; chapter-end **chains** (the original "stop, no auto-continue" is superseded).
- Highlight is word-level, by `data-fq-word` attribute, no ref registry; `QuranWord` does not consume the context; hold-last on a `null` segment.
- One app-wide playback lifecycle (ADR 0056) — navigation never stops it. Follow is a two-state attach/detach machine in the `RecitationFollow` leaf; the reader never snaps back on a clean manual navigation.
- The return affordance is a **second nav row** (`RecitationReturnStrip`) that reserves space, never a floating element; it toggles with the nav overlay on mobile/tablet.
- Stop points: `page | surah | rub | hizb | juz | none | custom`. `none` = through `114:6`. Whole-range repeat is hidden for `none`, kept for `juz`/`hizb`/`rub` (incl. cross-chapter reload-on-repeat).
- Settings sheet uses a draft model with an explicit Apply/Start footer; a per-session Start From picker (never persisted); a per-ayah repeat cycle button on the bar/rail. Addendum 9's "no independent from picker" survives everywhere except the sheet; Addendum 12 #394's progress badge was removed.
- "Play from here" is a single instant-play button — never opens the sheet.
- Nested `Popover`/`Command` inside a `Dialog`/`Sheet` must pass a `container` prop pointed at the parent's own portaled node (reusable primitive fix, DECISIONS.md).

## Revision History

- 2026-07-10 — folded Addendum 1 (play-from-ayah + player settings): `RecitationContext` moved from "always page-start to chapter-end" to a configurable range (`startVerseKey`, `stopPoint`, `perAyahRepeatCount`, whole-range repeat, speed, pause-between-repeats), with a settings sheet reachable from `MarkModal` and the player bar gear.
- 2026-07-14/15 — folded Addendum 2 (the QDC adapter — one provider, no registry), Addendum 3 (localized reciter names), Addendum 4 (the play button moved into the navbar on mobile, the origin of the bar/rail forms).
- 2026-07-16 — folded Addendum 5 + 5b + 5c: `rub`/`hizb`/`juz`/`none` stop points, and **cross-chapter chaining** — chapter-end auto-continues into the next chapter's audio (formally superseding ADR 0021's "no auto-continue"; also fixed `page` spanning a surah boundary, and added the real `"ended"` detection that was missing). 5b: sheet UI polish + the reusable nested-`Popover`-in-`Sheet` `container` fix. 5c: an Opus review pass — `scheduleSeek(0)` must `play()`, `decideChapterEnd` excludes `none` from range-repeat, `hasOwnProperty` scope validation, `loadChapter` extracted to kill copy-paste divergence.
- 2026-07-17 — folded Addendum 6: "Play from here" no longer forces the settings sheet open; `openSettings(startVerseKey)` removed as dead code (not reintroduced since).
- 2026-07-24 — folded Addendum 7: whole-range repeat never actually looped — `seekToRangeStart`'s **same-chapter** branch seeked the audio but left `currentVerseKeyRef` stale at the stop verse, so `isStopVerse` re-fired and burned through `rangeRepeatsDoneRef` in a few ticks. Fixed by setting `currentVerseKeyRef`/`setCurrentVerseKey`/`followPage` on that branch, mirroring the cross-chapter path.
- 2026-07-26 — folded Addendum 8: a stale `router.push` bullet in DECISIONS.md (doc-only).
- 2026-07-30 — folded Addendum 9: a custom "stop at" point — a page or verse target independent of the launch verse (`CustomRangePicker`). Established "no independent 'from' picker" and "displayed value always matches what `resolveStopTarget` will use" — both later partially superseded by Addendum 12's sheet-only Start From picker + draft model.
- 2026-08-02 — folded Addendum 10: stop recitation when leaving the reader route (motivated by Trello #152 — the full-width player bar overlapping non-reader content). **Superseded by Addendum 13** — the overlap is now handled by the reserved-space return strip instead, and playback is global.
- 2026-08-03 — folded Addendum 11: the word-level highlight landed on the wrong DOM copy (the pager mounts three panels). **Deleted the DOM ref registry** — highlight by `data-fq-word` attribute + `document.querySelectorAll` toggle on every match; `QuranWord` stops consuming the context; segment resolution filters malformed QDC 1-/2-element segments and holds the last highlight on a `null` (inter-word gaps + verse-boundary skew). Recorded as ADR 0021's 2026-08-03 addendum.
- 2026-08-25 — folded Addendum 12 (Issues #390–#394): the settings sheet draft model + explicit Apply/Start footer (#392); a per-session Start From picker above "Stop at", never persisted, `start ≤ end` by mutual push-apart (#393); a per-ayah repeat cycle button on the bar/rail (#391). Explicitly superseded Addendum 9's "no independent from picker" (sheet only) and its "displayed==committed" invariant (broken inside the open sheet by the draft). #394's progress badge was added and then **removed** on 2026-09-01.
- 2026-09-01 — folded Addendum 13 (Issue #467, [ADR 0056](../architecture/adr/0056-recitation-global-playback-and-detachable-follow.md)). **Supersedes Addendum 10** (hard stop on route leave) **and** the "swiping away while playing snaps back" forced follow. Playback is now one app-wide lifecycle; follow is a two-state `isFollowing` attach/detach machine in the `RecitationFollow` leaf (`ReaderPager` still gains no `useRecitation()`); the way back to a detached session is `RecitationReturnStrip`, a second nav row that reserves space (`--fq-nav-extra`) and toggles with the nav overlay. Deleted Addendum 12 #394's `rangeProgress`/`perAyahProgress` state and badge; `RecitationPlayerBar` is reader-route-only and its verse-key line became `recitedVerseLabel`. **Known follow-up:** `followTo` still silently drops a follow issued mid drag/commit — the stale-`prevRecitedPage` retry covers the common case but not a follow lost right before a sub-threshold drag-return.
