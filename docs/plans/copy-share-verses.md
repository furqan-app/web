# Copy and Share Verses from Mark Modal

**Type:** feature
**Date:** 2026-08-30
**Status:** implemented — category-grid refinement verified
**Issues:** #396 (epic), #397 (API & formatting), #398 (UI & interaction)

## Revision (2026-08-30)

First pass added a share panel (WhatsApp/Telegram/X/Facebook/LinkedIn) to `MarkModal.tsx`. Review surfaced three problems, root-caused before any further code changes:

1. **Panel design** — colored circle brand badges (W/T/𝕏/f/in) violate `docs/design/design-principles.md`'s ban on filled/circle-wrapped icon treatments. Project has no brand-icon library (lucide-react only, per DECISIONS.md) so real logos are not an option.
2. **X/Twitter 280-char limit** — long verses (worst case 2:282) overflow X's compose box. Quranic text must never be truncated silently/mid-word without the user knowing more follows.
3. **LinkedIn/Facebook "errors"** — both platforms' share endpoints (`sharing/share-offsite`, `sharer.php`) stopped accepting custom title/text params years ago; they scrape Open Graph tags from the target URL instead. This app has **zero** `openGraph` metadata anywhere (verified: no `generateMetadata`/`metadata.openGraph` in the whole repo), so LinkedIn has nothing to render and shows an error card. (Also: LinkedIn's crawler cannot reach `localhost`, so this can only be verified end-to-end against a public/deployed URL — expected during local dev.) Telegram (`t.me/share/url`) has no known text-length limit in our range and needs no OG tags; if it still errors after the fixes below, that needs a fresh repro with the actual error text.

Decisions made with the user:
- Fix OG tags as part of this task (not split out) — it's blocking 2 of 5 share targets.
- X: when verse + attribution would exceed the limit, truncate the verse text at a word boundary and append a "Continue reading" line + deep link, rather than silently cutting it off.
- Redesign the platform badges as outline/monochrome (no color fill) — keep the badge shape, drop the brand-color background.

## Summary

Allow users to copy or share a Quran verse directly from the MarkModal. The copied/shared payload includes the full Uthmanic verse text in Quranic brackets, a localized attribution line (surah name + verse number), and a deep link to the reader page. Works for both word-level and verse-level marks. For word-level marks the full verse is fetched lazily (on button click) via the existing verse API; verse-level marks already carry `verseDisplayText`. Falls back to on-page text if offline or fetch fails.

## Root Cause / Approach

The MarkModal already has all the metadata needed (surah name, ayah number, page number, locale). What is missing:

1. A pure formatting utility (`formatVerseSharePayload`) that assembles the text payload.
2. Copy + Share action buttons wired into the existing 2-column quick-actions grid (expanded to 2×2).
3. Lazy fetch of full verse text for word-level marks (verse-level already has `verseDisplayText`).

The verse API endpoint at `GET /api/quran/verses/[verseKey]` already exists and returns `{ data: { verse_key, text_uthmani } }` — no new endpoint needed.

## Decision Tree / Algorithm

### Payload assembly

As actually implemented (deviates from the original spec below it: no `origin`/`pageNum` params — the deep link is built separately by the caller via `highlight.addToUrl()`, not concatenated inside the pure utility):

```
formatVerseSharePayload({ verseText, surahName, ayahNum, locale, maxLength?, continueReadingLabel? })
  → `﴿ ${verseText} ﴾\n${surahPrefix} ${surahName}: ${localizedAyah}`
```

Where:
- `surahPrefix` = `'سورة'` when `locale === 'ar'`, otherwise `'Surah'`
- `localizedAyah` = `toLocaleNumeral(ayahNum, locale)`
- `maxLength`/`continueReadingLabel` — new, optional (see "X/Twitter length handling" below); when both are provided and the assembled text would exceed `maxLength`, apply word-boundary truncation instead of the plain form above.

The link itself is appended by the caller (`MarkModal`), one newline after this function's return value — keeps the utility pure and platform-agnostic (Copy/WhatsApp/Telegram append the plain page URL; X appends it after the truncation-aware payload; Facebook/LinkedIn don't use the text payload at all, only the URL).

### Copy action

| Condition | Behaviour |
|-----------|-----------|
| verse-level mark | use `verseDisplayText` directly — no fetch |
| word-level mark, online | fetch `/api/quran/verses/[verseKey]`, use returned `text_uthmani` |
| word-level mark, offline or fetch fails | fall back to `markFor.qpc_uthmani_hafs` (single word) |
| clipboard write succeeds | show checkmark icon for 2 s, then reset |
| clipboard write fails | silently no-op (browser may deny in non-secure context) |

### Share action

| Condition | Behaviour |
|-----------|-----------|
| Share trigger | opens a small, Dialog-contained `Popover` |
| Share choices | Copy plus WhatsApp, Telegram, X, Facebook, and LinkedIn links |
| Same verse text resolution as Copy | identical lazy fetch/fallback logic |

The Share trigger is always rendered. Its choices use the app's monochrome,
semantic hover treatment rather than provider brand colours.

### Deep link

Build via the existing `highlight.addToUrl()` util (`app/utils/highlight.ts`), using the `'selection'` `HighlightType` (blue, zero current consumers). **Not** `'linking-mark'` — that key is the on-page color for the persisted `linking` mark *category* (one of the six real categories under "Color Marks Are Semantic Categories" in DECISIONS.md), so reusing it here would make a temporary shared-link arrival visually indistinguishable from someone's actual saved "linking" mark on an unrelated verse:

```
highlight.addToUrl({ verseKey, pageNumber, type: 'selection', basePath: `/${locale}/pages` })
→ /{locale}/pages/{pageNum}?highlight={verseKey}&highlight-type=selection
```

This is still the canonical self-reader URL (never a grant URL, per the original decision) — it now also scrolls-into-highlight the shared verse on arrival via the existing `QuranWord.tsx` consumer, no new highlight machinery needed.

### X/Twitter length handling

X caps posts at 280 chars; t.co shortens any link to a flat 23 chars regardless of length, so budget the link separately from the text budget. Quranic text must never be silently cut off mid-word:

```
budget = 280 − 23 (link) − 1 (newline before link) − len(attribution line) − len(continueReadingLabel) − 1 (newline)
if len(`﴿ ${verseText} ﴾`) > budget:
  truncate verseText at the last word boundary within budget, append "…"
  payload = `﴿ ${truncated}… ﴾\n${attribution}\n${continueReadingLabel}`
else:
  payload = `﴿ ${verseText} ﴾\n${attribution}`  (unchanged from base case)
```

`formatVerseSharePayload` gains optional `maxLength`/`continueReadingLabel` params (both undefined → old unbounded behavior, used by Copy/WhatsApp/Telegram). Only the X platform passes them. Truncation must never land mid-word — split on the last space within budget.

### Open Graph metadata

Add `openGraph` (+ `twitter` card) fields to the root `metadata` export in `app/layout.tsx` — title "Furqan", the existing tagline/description, and `icon-512.png` as the image (no dedicated 1200×630 banner exists; square icon is an acceptable fallback, not a blocker for this task). This is app-wide static metadata (no `generateMetadata`, no per-request/per-verse dynamic content) so it doesn't interact with the ISR/CDN caching in ADR 0035. Fixes LinkedIn and Facebook preview cards; also improves Telegram/WhatsApp link previews as a side effect. Per-verse dynamic OG previews (e.g. showing the actual verse text in the card) are explicitly out of scope — static app-level branding is enough to stop the LinkedIn error.

### Platform panel redesign — superseded (2026-08-30, second pass)

First redesign pass kept the inline expandable `<div>` panel (avoiding `Popover` to sidestep the Dialog focus-trap conflict) and just restyled the badges to outline/monochrome. User feedback after seeing it: fold Copy into Share as one more icon, and turn the whole thing into "justified icons next to each other" behind "a small tooltip" on the Share button — i.e. a compact popover, not a full-width inline panel.

**Current shape:** `Popover`/`PopoverTrigger`/`PopoverContent` (`components/ui/popover.tsx`), correctly nested inside the Dialog per DECISIONS.md's established pattern (not avoided) — `PopoverContent`'s `container` prop is pointed at `DialogContent`'s own DOM node, captured via `const [dialogContentEl, setDialogContentEl] = useState<HTMLDivElement | null>(null)` + `<DialogContent ref={setDialogContentEl}>`, exactly mirroring `RecitationSettingsSheet`'s reciter combobox. This is what avoids the focus-trap fight the first pass's constraint was worried about — the fix was never "don't use Popover," it was "portal it into the Dialog's node."

**Quick Actions grid is now 3 buttons** (Play from here, Tafsir, Share), `grid-cols-3` — Copy is no longer its own grid button.

**Popover content** is a single compact flex row of icon-only, monochrome controls: Copy first, then the 5 platforms. No visible text labels — each carries `aria-label` only (`markModal.copyVerse`/`copied` for Copy, the platform's plain name for each link). The previously-unused `markModal.shareViaLabel` translation key is now consumed as an `sr-only` label on the popover region instead of being dead.

Loading state (`resolvedShareText === null`, while `resolveVerseText()` runs) still shows a centered `Loader2` spinner in place of the icon row. `handleShareOpenChange` (Popover's `onOpenChange`) replaces the old `openSharePanel` toggle — fetches once on first open, same as before.

## Verified Test Cases

| Case | Input | Expected payload |
|------|-------|-----------------|
| Verse mark, AR | verse 1:1, locale=ar | `﴿ بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ﴾\nسورة الفاتحة: ١` |
| Verse mark, EN | verse 1:1, locale=en | `﴿ بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ﴾\nSurah Al-Fatihah: 1` |
| Word mark, offline | single word, no fetch | payload uses the single word as `verseText` (degraded but functional) |
| X, long verse (e.g. 2:282) | `maxLength: 257` (280 − 23 t.co budget), `continueReadingLabel: "Continue reading"` | verse text truncated at the last word boundary within budget + `…`, followed by attribution line, followed by the continue-reading label — never a mid-word cut |
| X, short verse (e.g. 1:1) | same params, but assembled text fits under `maxLength` | identical to the unbounded case — truncation path is not taken just because `maxLength` was passed |

## Files to Change

- `app/utils/share-verse.ts` — add optional `maxLength`/`continueReadingLabel` params to `formatVerseSharePayload()` for X's truncation case
- `app/utils/share-verse.test.ts` — add cases: X truncation at word boundary, unbounded (existing) behavior unchanged
- `app/components/MarkModal.tsx` — swap plain page-number deep link for `highlight.addToUrl(...)`; pass X-specific `maxLength`/`continueReadingLabel` only for the `x` platform; fold Copy + the 5 platforms into one `Popover` behind the Share button (icon-only, justified row), replacing the inline `<div>` panel; grid goes from 2×2 to 3 buttons
- `app/components/MarkerColorPicker.tsx` — replace independently outlined category cards with one grouped, stable two-column selection surface.
- `app/constants/marks.ts` — replace ambiguous category icons: `Copy` → `GitCompareArrows`, `Type` → `ScanText`, and `Bookmark` → `Ellipsis`; retain the other three category icons.
- `app/layout.tsx` — add `openGraph`/`twitter` fields to the root `metadata` export
- `messages/en.json` / `messages/ar.json` — add the dynamic save/update and compact-note labels; keep existing share keys unchanged.
- `app/components/MarkModal.test.ts` — update the icon catalogue assertions.
- `e2e/tests/word-marking.spec.ts` — preserve existing mark behaviour coverage while asserting dynamic save/update labels, the always-visible note field, and the compact mobile sheet's reachable footer.

## New Translation Keys

| Key | EN | AR |
|-----|----|----|
| `markModal.copyVerse` | `Copy verse` | `نسخ الآية` |
| `markModal.shareVerse` | `Share verse` | `مشاركة الآية` |
| `markModal.copied` | `Copied` | `تم النسخ` |
| `markModal.surahPrefix` | `Surah` | `سورة` |
| `markModal.continueReading` | `Continue reading` | `تابع القراءة` |
| `markModal.saveMarkWithCategory` | `Save: {category}` | `حفظ: {category}` |
| `markModal.updateMarkWithCategory` | `Update: {category}` | `تحديث: {category}` |
| `markModal.close` | `Close mark panel` | `إغلاق لوحة العلامة` |

## Constraints

- Use `markFor.qpc_uthmani_hafs` (joined words) for word-level verse text, never `verse.text_uthmani` directly — consistent with DECISIONS.md font contract (the API already does this correctly).
- `formatVerseSharePayload` must be a pure function (no `window` access) — pass `origin` as a parameter so it is testable without a DOM.
- The copy/share buttons must have accessible `aria-label` values (use the same translation keys).
- Lucide icons: `Copy` for copy action, `Share2` for share action, `Check` for copied confirmation state.
- Deep link is always the canonical reader: `/{locale}/pages/{pageNum}`, now with `?highlight=<verseKey>&highlight-type=selection` — never a grant URL.

## What NOT to Do

- Do not add a new API endpoint — `GET /api/quran/verses/[verseKey]` already returns `text_uthmani`.
- Do not pre-fetch verse text on modal open — fetch lazily on button click only.
- Do not hide the Share trigger when native sharing is unavailable — always render the trigger and its Popover choices.
- Do not use `verse.text_uthmani` from the DB directly for display — use word-joined `qpc_uthmani_hafs` (the API already does this; don't bypass it).
- Do not use a grant URL for the deep link.
- Do not add range selection of multiple verses (out of scope per #396).
- Do not add custom image generation (out of scope per #396).
- Do not add a new `HighlightType` — reuse the existing unused `'selection'` entry in `app/utils/highlight.ts`. Do not use `'linking-mark'` — that's the persisted `linking` mark category's color, not a generic pointer.
- Do not build per-verse dynamic Open Graph metadata (e.g. `generateMetadata` reading `searchParams`) — static app-level `openGraph` on the root layout is enough to fix the LinkedIn/Facebook error; per-verse preview cards are a separate, unrequested feature.
- Do not pass `maxLength`/truncation to any platform except X — WhatsApp/Telegram/Copy/Facebook/LinkedIn keep the full, untruncated verse text.
- If using a `Popover` nested inside `MarkModal`'s `Dialog`, always pass its `container` prop pointed at `DialogContent`'s captured DOM node — omitting it puts the Popover's portal outside the Dialog's `FocusScope` and the Dialog yanks focus back on every interaction. Do not use `DropdownMenu` here (untested for this nesting case); `Popover` with `container` is the sanctioned pattern (DECISIONS.md, "UI Component Library").

## Decisions Made

- Lazy fetch on click (not on modal open) — most modal opens are for marking, not sharing; pre-fetch wastes bandwidth.
- Share trigger always visible; its contained Popover offers Copy and the five supported platform links — avoids conditional rendering complexity.
- ~~2×2 quick-actions grid — four equal-weight actions, no visual hierarchy implied.~~ Superseded: 3-button grid (Play/Tafsir/Share), Copy moved into the Share popover as an icon alongside the platforms.
- Canonical reader URL for deep link, extended with `highlight`/`highlight-type` params — grant URLs are session-specific and not shareable; highlighting the shared verse on arrival reuses existing, already-wired infrastructure.
- `formatVerseSharePayload` is pure — enables vitest unit tests without mocking `window`.
- X truncates at a word boundary with an explicit "Continue reading" line + link rather than cutting Quranic text off silently or letting X reject/overflow it unhandled.
- Root-layout static `openGraph`/`twitter` metadata (not per-page/per-verse) fixes LinkedIn/Facebook, in scope for this task since it directly blocks 2 of 5 share targets.
- Platform badges go outline/monochrome instead of solid brand-color fill, per `docs/design/design-principles.md`'s ban on filled/circle-wrapped icons; badge shape and row layout otherwise unchanged.

## Approved Mark Modal Visual & UX Redesign (2026-08-31)

This supersedes the presentation details above, not the copy/share payload or
`Popover` behaviour. The modal is a calm annotation surface: scripture leads,
all six marks remain visible, and secondary actions are available without
becoming equal-weight cards.

### Layout and hierarchy

- Keep `Dialog`, `DialogTitle`, `DialogDescription`, the in-flow close button,
  and `useCloseOnBackGesture`. Centre the Surah name and localized ayah number
  between the existing drawn `fq-rule-mark` ornaments, with the mark type as a
  quiet line above; the close control uses a translated screen-reader label.
- Keep the Quran text in its correct `font-uthmanic`/RTL rendering contract,
  but remove its competing heavy card treatment and reduce it one type step.
  Give it generous whitespace; word-pronunciation remains a quiet inline control.
- Keep Play, Tafsir, and `Share2` visible in one continuous utility rail with
  one correct hairline separator between every adjacent action in both RTL and
  LTR. `Share2` continues to
  open the existing small `Popover`; Copy and all platforms remain there, with
  its portal container set to the enclosing `DialogContent`.
- Render all six category choices from the start in a two-column, three-row
  soft grid at every breakpoint. Each cell owns its subtle radius and border;
  there is no enclosing rounded border to clip a selected cell. The selected
  cell gets one complete emerald border, a quiet wash, a check, and visible
  keyboard focus; semantic category colour remains a small memory cue, never
  the sole signal.
- Put the category overline and fading rule directly above the group, using
  “ضع علامة للمراجعة” / “Add a review mark”. Keep the scan order stable across
  Arabic and English layouts.
- Keep the bounded note textarea visible below the categories from the start;
  it follows the current locale direction (`RTL` in Arabic) and is disabled
  only while offline.
- Turn the primary action into a low-radius, full-width emerald ink-seal
  footer with a separated bookmark-icon cell. It is not a pill, carries no
  gold/brand gradient, and uses semantic theme tokens. The label names the
  selected category: Save for new marks and Update for existing marks.
- In edit mode, render Remove as a quiet destructive text action below the
  footer, preserving its existing direct removal behaviour.

### Responsive behaviour

| Context | Layout | Save action |
|---|---|---|
| Compact/mobile | Same `Dialog` primitive styled as a bottom-anchored sheet; no internal scrolling | The compact one-screen composition keeps every action visible; the note field adapts its height when the keyboard is open |
| Tablet/desktop | Centred dialog with the same reading order | Full-width footer below the content |

Do not introduce a second overlay primitive or alter `DialogContent` defaults
for other callers. The responsive positioning belongs to `MarkModal` alone.

### Verified interaction cases

| Case | Expected result |
|---|---|
| New signed-in mark, no category | All utilities, categories, and the optional note field are visible; Save is disabled. |
| New signed-in mark, category selected | Selected row is unmistakable; the note stays available; Save label includes the selected category; successful save closes immediately and the reader highlight confirms it. |
| Existing mark without comment | Existing category is selected; the empty note field remains visible; footer says Update with that category; Remove remains available. |
| Existing mark with comment | Existing category is selected and the note field starts with the stored comment. |
| Signed-out visitor | Scripture, Play, Tafsir, and the share `Popover` remain available; category and note controls are replaced by the sign-in prompt. |
| Offline visitor | Copy/share uses the existing fallback; mark mutation and notes remain disabled with the existing offline explanation. |
| Arabic and English | UI direction mirrors; Quran text remains RTL; category order is stable; every control has a localized visible or screen-reader name. |
| Mobile with keyboard | The sheet never gains an internal scrollbar; its compact composition and adaptive note field keep the Save footer reachable without hiding Qur'an text, categories, or actions. |

### Constraints and explicit non-goals

- Preserve the existing share payload, lazy verse resolution, platform URLs,
  deep-link highlighting, and nested-`Popover` focus containment exactly.
- Do not add a native-share action, another platform, a new API endpoint,
  schema change, success toast, delayed close, or undo flow. The reader's new
  highlight is the success confirmation and the modal closes immediately.
- Do not hide any of the six categories or any of Play, Tafsir, or Share.
- Do not add raw colours, a new icon library, custom SVG category icons, a
  global `Dialog`/`Sheet` change, decorative stars, or a second visual world.
- Continue to use `lucide-react`; the approved category mapping is
  `RotateCcw`, `GitCompareArrows`, `ScanText`, `AudioWaveform`, `Link`, and
  `Ellipsis` respectively.

## Design Remediation

- `/impeccable layout` → `app/components/MarkModal.tsx`,
  `app/components/MarkerColorPicker.tsx`: replace equal-weight outlined cards
  with the agreed annotation reading order and responsive sheet/footer.
- `/impeccable distill` → `app/components/MarkModal.tsx`: preserve every
  feature while consolidating controls into the utility rail, note trigger,
  and grouped category surface.
- `/impeccable harden` → `app/components/MarkModal.tsx`, tests: cover the
  explicit save/update, existing-comment, offline, locale, focus, and
  mobile-keyboard states.
