---
title: Copy and Share Verses from Mark Modal
type: feature
date: 2026-08-30
status: implemented
area: marks
issue: 396
adr: [0050]
---

# Copy and Share Verses from Mark Modal

## Summary

Copy or share a Quran verse directly from `MarkModal`. The copied / shared text payload is the full Uthmanic verse in Quranic brackets `﴿ … ﴾`, a localized attribution line (`سورة {name}: {ayah}` / `Surah {name}: {ayah}`), and a link. Works for word-level and verse-level marks; word-level fetches the full verse lazily on click via `GET /api/quran/verses/[verseKey]`, verse-level already carries `verseDisplayText`; falls back to on-page text when offline.

Two things the feature grew after the first pass:
- **A dedicated per-verse share route** `app/[locale]/share/verse/[surah]/[ayah]/` ([ADR 0050](../architecture/adr/0050-per-verse-open-graph-share-route.md)) — every share target (all 5 platforms + native + Copy) links here. `generateMetadata` returns per-verse `og:description` (the verse text) so Facebook/LinkedIn preview cards show the verse; the page itself is a metadata-only redirect shim to the canonical reader with the verse highlighted.
- **Native share** — when `navigator.share()` exists, one button opens the OS sheet; the 5-platform `Popover` is the desktop-Firefox/Safari fallback. Copy stays available in both.

## Root Cause / Approach

`MarkModal` already has the metadata (surah name, ayah number, page number, locale). Added:

1. A pure formatting utility `formatVerseSharePayload({ verseText, surahName, ayahNum, locale })` → `` `﴿ ${verseText} ﴾\n${surahPrefix} ${surahName}: ${toLocaleNumeral(ayahNum, locale)}` `` (`surahPrefix` = `سورة` for `ar`, else `Surah`). No `window` access, no `maxLength`. The link is appended by the caller.
2. Copy + Share controls in the modal's utility rail.
3. Lazy full-verse fetch for word-level marks.
4. The `/share/verse` route + native-share branch (below).

## Decision Tree / Algorithm

### Verse text resolution (Copy and Share, identical)

| Condition | Behaviour |
|---|---|
| verse-level mark | use `verseDisplayText` directly — no fetch |
| word-level mark, online | fetch `/api/quran/verses/[verseKey]`, use `text_uthmani` (word-joined `qpc_uthmani_hafs`, as the API returns it) |
| word-level mark, offline / fetch fails | fall back to `markFor.qpc_uthmani_hafs` (the single word) |
| clipboard write succeeds | checkmark icon for 2s, then reset |
| clipboard write fails | silent no-op |

### Share button

| `navigator.share` present? | Share button | Copy location | Utility rail cells |
|---|---|---|---|
| yes (all mobile, desktop Chrome/Edge) | plain `<button>` → `navigator.share({ title, text: formatVerseSharePayload(...), url: buildShareUrl() })` in `try/catch` (swallow `AbortError`); `shareTextPromiseRef` memoises `resolveVerseText()`, primed on `onPointerDown`/`onFocus` so the fetch finishes before `onClick` (an `await` between the gesture and `navigator.share()` loses activation on Safari) | own rail cell | Play / Tafsir / Copy / Share |
| no (desktop Firefox/Safari) | opens the existing `Popover` (Copy + 5 platforms, icon-only monochrome row, `aria-label` each) | inside the popover | Play / Tafsir / Share |

`canNativeShare` is feature-detected SSR-safe: `useState(false)` + `useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share), [])`.

### Share URL

`buildShareUrl()` = `${origin}/${locale}/share/verse/${surahNum}/${ayahNum}` — used by every platform href, native share, and Copy. Numeric segments (not a `2:255` key). The `highlight.addToUrl` deep-link now lives inside the route's redirect target; `MarkModal` no longer imports `highlight`.

### The `/share/verse/[surah]/[ayah]` route

| Piece | Responsibility |
|---|---|
| `params.ts` — `parseSegment(raw)` | 1–3 digit positive int, rejects leading zeros (`/^[1-9]\d{0,2}$/`), else `null`. Split out so its unit test avoids Prisma / `server-only`. |
| `verse-data.ts` — `getShareVerseData(surah, ayah)` | `React.cache()`-wrapped; `parseSegment` → `normalizeVerseKey` (bounds surah 1–114, ayah vs `versesCount`) → one `quranPrisma.verse.findFirst` (`text_uthmani`, `page_number`) + `getSurahMeta`. Returns `{ verseKey, surahNum, ayahNum, pageNumber, surahNameArabic, surahNameSimple, plainText }` or `null`. `plainText` = `text_uthmani` via `toVersePlainText` (strips `۞` U+06DE, collapses whitespace). `import "server-only"`. |
| `page.tsx` — `generateMetadata()` | title `{surah} · {ayah}` (`markModal.shareVersePageTitle`), `description` = `plainText`, `openGraph`/`twitter` (`type: "article"`, `url`, `og:image` / `twitter:image` = `/icons/icon-512.png`, `twitter:card` = `summary`), `robots: noindex`. `notFound()` on invalid. |
| `page.tsx` — component | Renders inside the inherited `[locale]` layout (a `<main>` fragment). `<meta httpEquiv="refresh" content="0;url=…">` + inline `<script>location.replace(…)` + a visible `<a>` fallback. Target: `/{locale}/pages/{pageNumber}?highlight={surah}:{ayah}&highlight-type=selection` via `highlight.addToUrl`. **Never `redirect()`** — a 307 with no body strips the head before crawlers read OG tags (ADR 0050). |
| route config | `export const revalidate = 300;` `export const dynamicParams = true;` **no** `generateStaticParams` (6236×2 build pages — on-demand ISR only, ADR 0035 bound reused). |

| Route input | Result |
|---|---|
| valid `/{locale}/share/verse/{1..114}/{valid ayah}` | 200 HTML with OG tags (`og:description` = verse) + meta-refresh/JS redirect; `og:image` = app icon |
| surah/ayah out of range, or verse not found | `notFound()` (404) from both `generateMetadata` and the component |
| crawler (no JS) | OG tags + visible `<a>` fallback; no redirect followed |
| human | `location.replace` → canonical reader, verse highlighted + scrolled via the existing `QuranWord.tsx` `highlight-type=selection` consumer |

`selection` is the `HighlightType` used (blue, was unused) — **not** `linking-mark`, which is the persisted `linking` mark *category*'s colour and would make a shared-link arrival look like someone's saved mark.

### Where the verse text lands per target

WhatsApp / Telegram / X / Copy / native sheet — inline in the `text` payload. Facebook / LinkedIn — from the route's `og:description` (their share endpoints accept only a `u`/`url` param and scrape OG). X over-length verses: X opens its composer over the limit and the user trims — scripture is never truncated.

## Verified Test Cases

| Case | Input | Expected |
|---|---|---|
| Verse mark, AR | 1:1, `ar` | `﴿ بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ﴾\nسورة الفاتحة: ١` |
| Verse mark, EN | 1:1, `en` | `﴿ … ﴾\nSurah Al-Fatihah: 1` |
| Word mark, offline | single word, no fetch | payload uses the single word as `verseText` (degraded but functional) |
| Share 1:1, AR, native | mobile Chrome | OS sheet: title `الفاتحة · ١`, text = bracketed verse + attribution, url = `…/ar/share/verse/1/1` |
| Share 2:255, EN, no native | desktop Firefox | popover with Copy + 5 platforms; FB href = `sharer.php?u=<enc(…/en/share/verse/2/255)>` |
| FB/LinkedIn crawler fetches `/en/share/verse/2/255` | — | 200 HTML, `<title>` = `Al-Baqarah · 255`, `og:description` = Ayat al-Kursi (`۞` stripped), `og:image` = app icon (curl-verified) |
| Human opens `/en/share/verse/2/255` | — | meta-refresh + `location.replace` → `/en/pages/42?highlight=2:255&highlight-type=selection`, highlighted |
| `/en/share/verse/2/300`, `/en/share/verse/115/1`, `/en/share/verse/abc/1`, leading-zero segment | — | 404 (curl-verified) |

## Mark Modal redesign (2026-08-31)

Presentation only — the share payload, lazy verse resolution, platform URLs, deep-link highlighting, and nested-`Popover` focus containment are preserved exactly. The modal is a calm annotation surface: scripture leads, all six mark categories stay visible, secondary actions are available without becoming equal-weight cards.

- Keep `Dialog` / `DialogTitle` / `DialogDescription` / the in-flow close button / `useCloseOnBackGesture`. Centre the surah name + localized ayah number between the drawn `fq-rule-mark` ornaments; mark type as a quiet line above; translated screen-reader label on close.
- Quran text keeps its `font-uthmanic`/RTL contract but loses the competing heavy card, drops one type step, gains whitespace. Word-pronunciation stays a quiet inline control.
- Play, Tafsir, `Share2` in one continuous utility rail with a hairline separator between every adjacent action in RTL and LTR (`divide-x` + `rtl:divide-x-reverse`). `Share2` opens the same `Popover` (or native sheet); its portal `container` is the enclosing `DialogContent` node.
- All six category choices from the start in a two-column, three-row soft grid at every breakpoint; each cell owns its radius/border (no enclosing rounded border to clip a selected cell). Selected cell: one complete emerald border, quiet wash, check, visible keyboard focus. Category overline + fading rule directly above the group (`ضع علامة للمراجعة` / `Add a review mark`); stable scan order across locales.
- Bounded note textarea visible below the categories from the start; follows locale direction; disabled only while offline.
- Primary action: low-radius, full-width emerald ink-seal footer with a separated bookmark-icon cell — not a pill, no gold/brand gradient, semantic theme tokens. Label names the selected category (`Save: {category}` / `Update: {category}`). In edit mode, Remove is a quiet destructive text action below the footer.

| Context | Layout |
|---|---|
| Compact / mobile | the same `Dialog` primitive styled as a bottom-anchored sheet; no internal scrolling; the note field adapts height when the keyboard is open, Save footer stays reachable |
| Tablet / desktop | centred dialog, same reading order, full-width footer below the content |

Category icons (lucide): `RotateCcw`, `GitCompareArrows`, `ScanText`, `AudioWaveform`, `Link`, `Ellipsis`.

## Files to Change

- `app/utils/share-verse.ts` — `formatVerseSharePayload` is the unbounded form only (`truncateAtWordBoundary` + `maxLength`/`continueReadingLabel` deleted); new `toVersePlainText(text_uthmani)` (strips `۞`, collapses whitespace).
- `app/utils/share-verse.test.ts` — "full text, no cap" case (truncation cases removed).
- `app/[locale]/share/verse/[surah]/[ayah]/params.ts` + `params.test.ts` — `parseSegment` (pure; leading-zero rejection).
- `app/[locale]/share/verse/[surah]/[ayah]/verse-data.ts` — `getShareVerseData` (`cache()`-wrapped, `server-only`, `toVersePlainText`).
- `app/[locale]/share/verse/[surah]/[ayah]/page.tsx` — `generateMetadata` (+ `robots: noindex`) + the redirect-shim component.
- `app/api/quran/verses/[verseKey]/route.ts` — `text_plain` runs through `toVersePlainText` so the payload and `og:description` are the identical string.
- `app/components/MarkModal.tsx` — `buildShareUrl()` replaces `buildPageUrl()` for every target; `canNativeShare` feature detect; native-share branch (4-cell rail, own Copy + Share) vs popover fallback (3-cell, Copy in popover); `RAIL_BUTTON_CLASS` extracted; `highlight` import dropped; `shareTextPromiseRef` memoises verse-text resolution, cleared on modal open; the X `maxLength`/`continueReadingLabel` args removed. Plus the redesign layout (utility rail, always-visible categories + note, emerald footer, mobile sheet).
- `app/components/MarkerColorPicker.tsx` — one grouped, stable two-column category selection surface.
- `app/constants/marks.ts` — the approved category icon mapping above.
- `app/layout.tsx` — the root static `openGraph`/`twitter` block stays the app-wide default (unchanged by the per-verse route).
- `messages/en.json` / `messages/ar.json` — `markModal.copyVerse` / `shareVerse` / `copied` / `surahPrefix` / `saveMarkWithCategory` / `updateMarkWithCategory` / `close` / `shareVersePageTitle` (`{surah} · {ayah}`) / `shareVerseOpenReader`; the previously-dead `markModal.shareViaLabel` is now the popover region's `sr-only` label; `markModal.continueReading` removed.
- `app/components/MarkModal.test.ts` — icon catalogue assertions.
- `e2e/tests/word-marking.spec.ts` — mark-behaviour coverage + dynamic save/update labels, always-visible note, reachable mobile footer. Unchanged for Share (Chromium exposes no `navigator.share`, so the popover path stays active).
- `docs/architecture/DECISIONS.md` — "Root-Layout Open Graph" entry amended.
- `docs/architecture/adr/0050-per-verse-open-graph-share-route.md` — new.

## Constraints

- `formatVerseSharePayload` must be a pure function — no `window` access, testable without a DOM.
- Use `markFor.qpc_uthmani_hafs` (word-joined) for word-level verse text, never `verse.text_uthmani` from the DB directly — the API already does this, don't bypass it.
- `og:description` / `<meta name="description">` use `text_uthmani` with `۞` (U+06DE) stripped — matches `text_plain` from the verses API. Never `text_imlaei_simple` (different orthography).
- Route validation happens before the Prisma query: `parseSegment` then `normalizeVerseKey`.
- `revalidate = 300` on the share route — do not remove it (ADR 0035 / ADR 0050); do not add `generateStaticParams`.
- The share route's redirect must be meta-refresh + `<script>` + `<a>` fallback. Never `redirect()` / `permanentRedirect()`.
- Native-share `catch` swallows `AbortError` (user dismissed the sheet) silently — no error surface.
- Keep the utility-rail hairline separators correct in RTL and LTR for whichever cell count is active (3 or 4).
- Copy/share buttons carry accessible `aria-label` values (the translation keys).
- Deep link is always the canonical reader (`/{locale}/pages/{pageNum}?highlight=…&highlight-type=selection`) — never a grant URL.
- The mark-modal redesign's responsive positioning belongs to `MarkModal` alone — do not alter `DialogContent` defaults for other callers or introduce a second overlay primitive.
- A `Popover` nested inside the `Dialog` must pass its `container` prop pointed at `DialogContent`'s captured DOM node (`useState` + `<DialogContent ref={…}>`), or the Dialog's `FocusScope` yanks focus back on every interaction. Do not use `DropdownMenu` for this nesting.

## What NOT to Do

- Do not add a new API endpoint — `GET /api/quran/verses/[verseKey]` already returns `text_uthmani`.
- Do not pre-fetch verse text on modal open — lazily on button click / gesture-prime only.
- Do not hide the Share trigger when native sharing is unavailable — the popover is the fallback; do not remove it.
- Do not use `verse.text_uthmani` from the DB directly for display, or a grant URL for the deep link.
- Do not add a new `HighlightType` — reuse `selection`. Do not use `linking-mark`.
- Do not add range selection of multiple verses, a success toast, delayed close, or undo flow (out of scope per #396 / redesign) — the reader highlight is the success confirmation and the modal closes immediately.
- Do not add per-verse `generateMetadata` to the reader route (`pages/[id]/page.tsx`) — the dedicated `/share/verse` route is the only place per-verse OG lives.
- Do not `generateStaticParams` the share route, or use the server `redirect()` helper in it.
- Do not change the root-layout static OG block — it stays the app-wide default for every other route.
- Do not render the share route as a real landing page with reader chrome — it is a metadata-only redirect shim.
- Do not switch only FB/LinkedIn to the new URL — all five platforms + native + Copy use `buildShareUrl()`.
- **Do not add custom image generation.** A `next/og` `ImageResponse` was built and removed — Satori cannot shape Arabic (verified: UthmanicHafs1Ver18, Noto Naskh Arabic, IBM Plex Sans Arabic all reverse word order / drop joins). `og:image` falls back to the app icon. A real verse-card renderer (headless-browser screenshot, or deploy-time pre-gen) is a deferred task; do not re-add `opengraph-image.tsx` here.
- Do not hide any of the six categories, or Play / Tafsir / Share, in the redesigned modal.
- Do not add raw colours, a new icon library, custom SVG category icons, a global `Dialog`/`Sheet` change, or provider brand-colour badges — controls are monochrome/semantic.

## Decisions Made

- Lazy verse fetch on click (not on modal open) — most opens are for marking, not sharing.
- Share URL is the dedicated `/share/verse` route for **every** target — protects the Static Generation Strategy and "no `generateMetadata` on Quran routes" (ADR 0050). Numeric path params, validated before query. Mild redundancy on X accepted (matches Quran.com).
- Native share replaces the popover entirely when `navigator.share` exists (not one more popover icon) — the OS sheet is the better surface and covers every platform. Copy kept in both paths.
- `notFound()` (404) for invalid verses, not a generic fallback card — bots should not cache a junk card under a junk URL.
- Verse text delivered via `og:description` (all platforms) plus the inline `text` payload (WhatsApp/Telegram/X/Copy/native). No rendered verse image (Satori limitation).
- X 280-char truncation removed — full verse text sent to every platform; X opens its composer over-length for the handful of long verses. Scripture is never cut.
- Root-layout static `openGraph`/`twitter` was added in the first pass to unblock LinkedIn/Facebook; the per-verse route then made their cards verse-specific.
- Platform badges are outline/monochrome, not brand-colour fills (`design-principles.md` ban on filled/circle-wrapped icons).
- Mark-modal redesign: calm annotation surface, all six categories always visible in a 2×3 grid, always-visible note field, full-width emerald ink-seal footer, `Dialog`-as-bottom-sheet on mobile. Documentation-only design intent; no new overlay primitive.

## Revision History

- 2026-08-30 — first-pass review (3 findings): brand-colour circle badges violated the icon-treatment ban → outline/monochrome; long verses overflowed X's 280 limit; Facebook/LinkedIn showed error cards because the app had zero `openGraph` metadata → root-layout static OG added in scope.
- 2026-08-30 (second pass) — the inline expandable panel became a compact icon-only `Popover` nested in the `Dialog` (portalled into `DialogContent`); Copy folded into the popover; quick-actions grid 2×2 → 3 buttons.
- 2026-08-31 — folded the "Approved Mark Modal Visual & UX Redesign" section into "Mark Modal redesign" above (presentation only; payload/Popover behaviour preserved).
- 2026-08-31 — folded Addendum "Per-verse Open Graph share route + native share sheet" (#486, [ADR 0050](../architecture/adr/0050-per-verse-open-graph-share-route.md)). **Supersedes three earlier constraints:** (1) "Do not build per-verse dynamic Open Graph metadata" — now built on a dedicated `/share/verse` route; (2) "Do not add a native-share action" — now added, gated on `navigator.share` detection; (3) the X 280-char truncation path (`maxLength`/`continueReadingLabel` on `formatVerseSharePayload`) — removed, full text always sent. "Do not add custom image generation" still holds (a `next/og` image was tried and removed — Satori can't shape Arabic).
- 2026-09-02 (#494) — the `## Design Remediation` section's `/impeccable layout|distill|harden` commands no longer exist; the redesign's design-quality checks are a manual concern now.
