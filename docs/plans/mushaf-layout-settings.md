---
title: Unify Tajweed toggle + offline downloads into one Mushaf Layout setting
type: feature
date: 2026-08-17
status: implemented
area: rendering
issue: 256
adr: [0014, 0023]
---

# Unify Tajweed toggle + offline downloads into one Mushaf Layout setting

## Summary

Replace the two separate Settings sections — "Tajweed Colors" (an on/off `Switch` that flips the active reading edition) and "Offline Access" (a single downloadable row, hardcoded to the default edition) — with one "Mushaf Layout" section. It lists every registered mushaf edition (today: **مصحف مجمع الملك فهد** / "King Fahd Complex Mushaf (1405H print)", id 2, and **مصحف التجويد** / "Tajweed mushaf", id 19), each row showing a thumbnail, an independent download action, and an independent switch action. Both editions can be downloaded and kept offline simultaneously — no eviction. The first-run/install-time download flow is unchanged (default edition only).

This both delivers issue #256's original ask (a Tajweed download row) and requires the technical work #256 already scoped: the bulk precache mechanism (`app/sw.ts`, `app/constants/offline.ts`, `use-pwa-precache.ts`) is hardcoded to one edition and must become edition-parameterized.

## Approach

**Existing infrastructure this builds on (all already shipped):**
- `MUSHAF_EDITIONS`/`MUSHAF_EDITION_IDS` (`app/utils/mushaf-editions.ts`) — the edition registry from `tajweed-mushaf-mode.md` Task 3. Already generic; a third future edition needs no code change here.
- `QuranMushafContext` (`mushafId` state, `localStorage`-persisted) — already what the "switch" action needs to call.
- `OfflineEditionRow` (`app/components/offline/OfflineAccessSection.tsx`) — already extracted per-row, built anticipating a second row (per its own comment). It becomes the base for the new unified row, extended with a thumbnail and a switch action, and driven by a loop over `MUSHAF_EDITION_IDS` instead of a single hardcoded call.
- `usePwaPrecache` — becomes edition-aware (see Decision Tree).

**New work:**
1. Edition-aware precache plumbing (SW + constants + hook) — ADR 0014 Addendum 5.
2. `MushafLayoutSection` — new unified Settings component, replacing both `OfflineAccessSection` and the inline "Tajweed Colors" block in `SettingsSidebar`.
3. Static thumbnail generation — one small pre-rendered snippet image per edition.
4. Bibliographic naming — sourced, not guessed (see Verified Test Cases).

## Decision Tree / Algorithm

**Section replaces two existing ones.** `SettingsSidebar.tsx` drops its inline "Tajweed Colors" block (lines ~121–145) and its `<OfflineAccessSection />` call, replacing both with a single `<MushafLayoutSection />`.

**Per-row state** (one row per `MUSHAF_EDITION_IDS` entry, thumbnail + name + independent download icon + independent switch icon):

| # | Condition | Download icon | Switch icon |
|---|---|---|---|
| 1 | Not downloaded, not active, online | idle "Download" | enabled "Switch to this layout" |
| 2 | Downloading (this edition's own run) | per-edition progress ring/bar | enabled — switching mid-download is fine, rendering is on-demand either way |
| 3 | Downloaded, not active | "Downloaded" (check, no-op) | enabled |
| 4 | Active edition | as above | "Active" marker, not tappable |
| 5 | Offline, this edition's assets not cached for the page currently open | disabled | enabled; on switch, falls through to the existing "not available offline" notice ( `pwa-offline-support.md` Addendum 3/4) — **no new code needed**, `use-quran-page.ts` already keys its React Query cache on `mushafId`, so the pause/error state is already edition-scoped |
| 6 | Browser tab (not installed PWA) | hidden (`isStandaloneDisplayMode()` false — ADR 0014) | still shown/enabled — switching/on-demand network rendering has never been PWA-gated and must not become so |

**Download and switch are fully independent actions** — confirmed. Switching never requires downloading first; the reader has always rendered any edition on-demand over the network (that's how Tajweed mode works today). Downloading never changes the active edition.

**No eviction.** Downloading a second edition never deletes a previously-downloaded one. A user may end up with both editions fully cached (~99 MB combined) — accepted, matches ADR 0014 Addendum 5 / ADR 0023 Addendum 7.

**Thumbnails are static, pre-rendered, not live.** A one-off script (pattern: `scripts/generate-pwa-icons.js`) renders a small fixed snippet — the Surah Al-Fatiha basmalah line, `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ` — in each edition's real glyph font (reusing the same `code_v1`/`code_v2` + font-file pairing the reader uses) to a committed static image per edition (`public/mushaf-previews/{mushafId}.png` or `.svg`). Rationale: a live-rendered snippet would need to fetch that edition's per-page font (~84 KB, more for Tajweed's COLRv1 files) just to draw a Settings row, including for editions the user hasn't chosen to download — not worth it for content that only changes when the font assets themselves change.

## Verified Test Cases

**Naming — sourced, not guessed:**

| Edition | mushaf_id | Name (ar) | Name (en) | Source |
|---|---|---|---|---|
| Default | 2 | مصحف مجمع الملك فهد (طبعة ١٤٠٥هـ) | King Fahd Complex Mushaf (1405H print) | qurani.ai `/v1/mushaf-layouts` docs: `"name": "Quran Complex V1 ( 1405 print )"` — confirmed live via `WebFetch`, not assumed. The user's own first guess (1422H) was explicitly checked against this and corrected. |
| Tajweed | 19 | مصحف التجويد | Tajweed mushaf | quran.com's own locale files (`locales/{en,ar}/common.json:169`, reference repo): short label is `"tajweed": "Tajweed"` / `"التجويد"`; the fuller attribution ("Easy Quran - Dar Al Marifa Tajweed Mushaf" + "KFGQPC Uthmanic Hafs V4 Fonts") is a description, not a name, and correctly has **no print year** — Tajweed coloring is digital fonts over the same Hafs text, never a separate physical print edition. |

**Row-state walkthroughs** (against the table above):

- Fresh install, nothing downloaded, installed PWA, online → both rows show state 1: idle download + enabled switch. Matches today's first-run gate having covered only the default edition.
- User taps "Switch" on the Tajweed row without ever downloading it → `mushafId` flips immediately (unchanged `QuranMushafContext` mechanism), current page re-renders via on-demand network fetch of that edition's JSON+font — identical to today's Tajweed toggle behavior. No download starts.
- User taps "Download" on the Tajweed row while the default edition is already fully downloaded → default row stays state 3 (untouched, no eviction); Tajweed row moves through state 2 to state 3 independently, own sentinel/progress.
- User goes offline with only the default edition downloaded, currently on the default edition, taps "Switch" to Tajweed on a page whose Tajweed JSON/font was never fetched → state 5: switch succeeds (context flips), reader shows the existing "not available offline" notice for that page — this is `ReaderPager`/`QuranSpread`'s existing `unavailableOffline` flag, already keyed by the active `mushafId`'s query, so it fires correctly with zero new logic.
- Browser tab (never installed) → both rows show state 6: no download icon at all (consistent with ADR 0014's "never trigger a bulk download outside standalone"), switch icon still works exactly as the old inline Tajweed toggle did in a browser tab today.

## Files to Change

**Edition-aware precache (ADR 0014 Addendum 5):**
- `app/constants/offline.ts` — replace single `PRECACHE_MUSHAF_ID` with per-edition helpers over `MUSHAF_EDITION_IDS`; `pageFontUrl`/`pageJsonUrl`/`VERSE_PAGES_URL` take `mushafId`; `PRECACHE_SENTINEL_URL`/`PRECACHE_DISMISSED_KEY` become per-edition; `ClientToSwMessage`/`SwToClientMessage` gain `mushafId`.
- `app/sw.ts` — `precacheAllPages`, `countCachedPages`, `isCacheComplete`, the sentinel write, all parameterized by `mushafId`; path-regex matching for `/quran/pages/{mushafId}/{page}.json` extracts and groups by edition.
- `app/hooks/use-pwa-precache.ts` — one state machine instance per edition (or a single hook parameterized by `mushafId`, called once per row); status/progress requests carry `mushafId`.

**Unified Settings UI:**
- `app/components/mushaf/MushafLayoutSection.tsx` (new) — replaces `OfflineAccessSection`; maps `MUSHAF_EDITION_IDS` to rows.
- `app/components/mushaf/MushafLayoutRow.tsx` (new, or extend `OfflineEditionRow` in place) — thumbnail + name + download icon (existing `OfflineEditionRow` state logic) + switch icon (new, reads/writes `QuranMushafContext`).
- `app/components/offline/OfflineAccessSection.tsx` — deleted, superseded by `MushafLayoutSection`.
- `app/components/SettingsSidebar.tsx` — remove the inline "Tajweed Colors" block (`Switch` + labels) and the `<OfflineAccessSection />` call; add `<MushafLayoutSection />`. Drop the now-unused `DEFAULT_MUSHAF_ID`/`TAJWEED_MUSHAF_ID`/`useQuranMushaf` imports if nothing else in the file needs them.
- `app/utils/mushaf-editions.ts` — extend `MushafEdition` with `displayName: { ar: string; en: string }` (or thread through `messages/*.json` keys instead — pick one; do not duplicate the name in both the registry and i18n files) and `thumbnailUrl: string`.

**Thumbnails:**
- `scripts/generate-mushaf-thumbnails.js` (new) — renders the basmalah snippet per edition to `public/mushaf-previews/{mushafId}.png`, reusing each edition's real font pairing (`code_v1`/`code_v2` + font file) so the preview is accurate, not a generic placeholder.
- `public/mushaf-previews/2.png`, `public/mushaf-previews/19.png` (new, committed).

**i18n:**
- `messages/en.json`, `messages/ar.json` — new `mushafLayout.*` namespace (section title, per-edition names per the sourced table above, "Switch"/"Active"/"Downloaded" labels). Remove now-unused `tajweedMode`/`tajweedModeLabel`/`tajweedModeDescription` and `offline.madaniMushaf` if nothing else references them — grep before deleting.

**Docs (already done in this session):**
- `docs/architecture/adr/0014-pwa-offline-architecture.md` — Addendum 5.
- `docs/architecture/adr/0023-tajweed-mushaf-mode.md` — Addendum 7.
- `docs/architecture/DECISIONS.md` — "PWA & Offline Quran Page Caching" and "Tajweed Mushaf Mode" sections amended.

## Constraints

- Download and switch stay fully independent actions in every row — never make one imply the other.
- No eviction — downloading a new edition must never delete another edition's cache.
- The precache sentinel, dismissed-flag, and SW message contract must be per-edition (`mushafId`-scoped) — never shared, per ADR 0014 Addendum 5. A shared sentinel silently misreports readiness.
- First-run gate and install-time prompt stay single-edition (default only) — this task only extends the permanent Settings surface, per ADR 0023 Addendum 7.
- Tajweed fonts stay out of every *automatic*/install-time path — the exclusion narrows to "opt-in per-row," it does not disappear.
- Download icon hidden entirely outside `isStandaloneDisplayMode()`; switch icon always available regardless of standalone state.
- Edition display names are sourced bibliographic facts (see Verified Test Cases table) — do not alter them without a source, and do not invent a print year for the Tajweed edition (it has none — digital coloring fonts, not a separate print).
- Thumbnails are static pre-rendered assets — do not fetch a full per-page font at Settings-render time just to draw a preview.

## What NOT to Do

- Do not add tajweed fonts to the first-run gate, the install-prompt, or any other automatic/install-time precache path — only the permanent Settings row is edition-choice-driven.
- Do not add a storage-quota warning gate blocking a second edition's download — the ~99 MB combined size is an accepted, informed user choice (ADR 0014 Addendum 5), not something to defensively block.
- Do not evict or prompt to delete a previously-downloaded edition when a new one is downloaded.
- Do not make the switch action require or wait on a download.
- Do not live-render thumbnails from the actual glyph fonts at Settings-mount time — static pre-rendered assets only.
- Do not reuse the 1422H print-year figure anywhere — it was an explicitly incorrect placeholder, corrected to 1405H via qurani.ai's own documented API response.
- Do not invent a print-year name for the Tajweed edition — sourced material confirms it has none.

## Decisions Made

- Both editions independently downloadable and keepable offline simultaneously; no eviction (user confirmed).
- Download and switch are two separate icons/actions per row, not one combined action (user confirmed).
- Thumbnails: static pre-rendered snippet per edition, not live-rendered (recommended for cost reasons, no objection raised).
- Naming sourced from qurani.ai's public docs (v1: "Quran Complex V1, 1405 print") and quran.com's own locale files (v4: "Tajweed", no print year) — not from an MCP connection (qurani.ai's MCP server exists but isn't in Anthropic's registry and its connection URL wasn't discoverable; plain `WebFetch`/`curl` against public docs was sufficient for a one-time static fact).
- Issue #256 expanded in place (retitled, rescoped, retyped Task → Feature) to cover the full unified-setting redesign, rather than opening a second issue — user confirmed.
