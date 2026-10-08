---
title: "Arabic translation quality: leaked English, empty keys, broken plurals, weak phrasing"
type: bug
date: 2026-09-30
status: ready-to-implement
area: i18n
issue: 739
---

# Arabic translation quality: leaked English, empty keys, broken plurals, weak phrasing

## Summary

Review of `messages/ar.json` found three layers of defects: (A) hard bugs — two
English values (`close`, `plans.verse`) and ten empty duplicate root keys that
render blank UI; (B) grammar bugs — four counting strings with fixed singular
nouns (`home.resultsCount`, `search.resultsCount`, `plans.hero.streakDays`,
top-level `plans.pagesPerDay` / `versesPerDay`), one wrong plural
(`hizb-three-quarters`), and hamza/tanween spelling errors (`لاحقاً`, `جداً`,
`شيئاً`, `تلقائياً`); (C) weak phrasing — ~12 awkward or inconsistent strings
(`البحث التنقلي`, `تخطيط المصحف`, `تربيط`, `تحديد` vs `علّم`, `التلاوة` vs
`القراءة`, …). This plan lists every key with its exact replacement so
implementation is mechanical, plus the four call-site changes needed where a
plain interpolation becomes an ICU plural.

## Root Cause / Approach

Translation debt accumulated from two sources: the `extract-translations`
drift documented in `docs/standards/i18n.md` (empty root-level keys such as
`overline`, `title`, `tagline` re-appearing as `""` in `ar.json`), and
hand-written copy that predates the ICU-plural policy in
`docs/architecture/decisions/i18n.md` (fixed `"صفحة/يوم"`, `"{count} نتيجة"`).
Approach: fix values only — no key renames, no `en.json` copy changes, no
logic changes beyond passing `{count, n}` at the four sites that become ICU
plurals. New/changed counting strings follow the six-category rule
(`zero/one/two/few/many/other`) and the `{count numeric, n: toLocaleNumeral}`
call pattern already established by `sidebar.filterResultsCount`
(`app/components/nav/Sidebar.tsx:316`).

## Decision Tree / Algorithm

Every change is one of three classes:

- **Class 1 — value-only fix in `ar.json`.** Replace the string; no code
  touch. Applies to all of Group A (except nothing — all value-only), Group B
  spelling items, and all of Group C.
- **Class 2 — value becomes ICU plural + call-site passes `{count, n}`.**
  Applies to `home.resultsCount` (2 call sites), `search.resultsCount`
  (1 call site), `plans.hero.streakDays` (2 call sites, same file).
- **Class 3 — migrate call-site to an existing ICU key.**
  Applies to `getPlanPaceSummary` (`app/lib/plans/ui-helpers.ts`), which
  composes `"{pace} صفحة/يوم"`: it now takes a values-capable `tIntl` and
  renders `plans.custom.pagesPerDay` / `versesPerDay` (values already correct
  and locked by tests); the 5 `MyPlansList.tsx` call sites pass `tIntl`.
  Top-level `plans.pagesPerDay` / `versesPerDay` are KEPT as static unit
  labels for the enroll-form stepper (a unit descriptor, not a counted
  phrase — no number is composed there), so `PlanEnrollForm.tsx` is untouched.

If the user vetoes any Group C row, that row is dropped — all other rows are
independent (no shared code), so partial approval is trivially supported.

## Verified Test Cases

ICU plural verification (walked through against CLDR Arabic categories, same
method as the existing `plans-ui.test.ts` suite):

| Key | count=0 | count=1 | count=2 | count=3 | count=11 |
|---|---|---|---|---|---|
| `home.resultsCount` (new) | لا توجد نتائج | نتيجة واحدة | نتيجتان | ٣ نتائج | ١١ نتيجة |
| `search.resultsCount` (new) | لا توجد نتائج | نتيجة واحدة | نتيجتان | ٣ نتائج | ١١ نتيجة |
| `plans.hero.streakDays` (new) | — (streak ≥ 1 always) | يوم واحد متتالٍ | يومان متتاليان | ٣ أيام متتالية | ١١ يومًا متتاليًا |
| `streaks.daysCount` zero (new) | لم تبدأ بعد | — | — | — | — |
| `totals.pagesCount/versesCount/khatmatCount` zero (new) | لم تبدأ بعد | — | — | — | — |

Non-plural rows verified by inspection: `close` → `إغلاق` matches the
`common.close` convention; `plans.verse` → `آية` matches the existing
`verse` root key; the 10 deleted root keys (`overline`, `title`, …) are never
resolved at root scope — every bare `t("title")`-style call site was checked
and resolves through a live namespace (`home.*`, `privacy.*`, `tafsir.*`,
`offlineTafsir.*`, `mushaf.viewingChipGeneric`); the one root-ns `tGlobal`
use reads `surah` (untouched).

Sweep (plan-task step 3b), 2026-09-30:

- **Existing tests:** `app/components/plans/plans-ui.test.ts` locks
  `plans.custom.*` ICU values — untouched by this plan. `useTranslations`
  fallbacks in `PlansTodayHero.tsx`, `HomeSearch.tsx`, `SearchResultsPage.tsx`
  are English defaults that only surface when a key is missing; all keys here
  keep their paths. **Correction (found during implementation): six e2e specs
  DID assert old Arabic copy** and were updated in the same diff:
  `word-marking.spec.ts` (`تعليم كلمة/آية`, `حفظ/تحديث: الربط`,
  sign-in prompt, `استمع إلى النطق`), `tablet-band-pointer-gating.spec.ts`
  (`تعليم كلمة`), `marks-offline-page.spec.ts` (`الربط`),
  `shared-mushaf.spec.ts` (`تحديث: الربط`, `تعليم كلمة`),
  `settings-persistence.spec.ts` (`طبعة المصحف`),
  `search-results-page.spec.ts` (`٤٨ نتيجة`, results header regex).
  `shared-mushaf.spec.ts` carries 2 pre-existing eslint unused-import errors,
  verified present on unmodified `origin/main` — left alone.
- **SW caching:** message catalogues are bundled, not `GET /api/*` — no
  `NetworkOnly` concern.
- **Offline signals:** none — static strings only.
- **`render-context.test.ts` locks `{{var}}` behavior** for
  `notifications.types.*` — untouched (see Decisions Made: the `{{ }}`
  convention is intentional there, not a bug).

## Files to Change

- `messages/ar.json` — all value fixes below; delete the 10 empty root
  duplicates. Top-level `plans.pagesPerDay` / `versesPerDay` stay (static
  stepper labels).
- `app/components/home/HomeSearch.tsx:126` — pass `{count: numeric,
  n: toLocaleNumeral}` for `home.resultsCount`.
- `app/components/search/SearchResultsPage.tsx:231` — same for
  `search.resultsCount`.
- `app/components/plans/PlansTodayHero.tsx:176,229` — pass `{count: numeric,
  n: toLocaleNumeral}` for `plans.hero.streakDays` via root-ns `tIntl`
  (the wrapper `t` accepts no values); second site drops its standalone
  numeral like the streak card below.
- `app/lib/plans/ui-helpers.ts:22` + `app/components/plans/MyPlansList.tsx`
  (5 sites) — `getPlanPaceSummary` takes values-capable `tIntl` and renders
  the existing `plans.custom.*PerDay` ICU messages.
- `app/components/plans/PlansProgressTab.tsx:317` — remove the standalone big
  numeral span before the `daysCount` message. The numeral + label composition
  is ungrammatical in Arabic for every category (`٠ ولا يوم`, `١ يوم واحد`,
  `٢ يومان`, `٣ ٣ أيام`); the message becomes self-contained and keeps the
  `text-2xl` slot styling.
- `app/components/plans/plans-ui.test.ts` — add Vitest ICU assertions for the
  three new plural messages (same `IntlMessageFormat` style as the existing
  `#610 polish` block); existing assertions unchanged.
- e2e specs asserting old copy (same diff): `word-marking.spec.ts`,
  `tablet-band-pointer-gating.spec.ts`, `marks-offline-page.spec.ts`,
  `shared-mushaf.spec.ts`, `settings-persistence.spec.ts`,
  `search-results-page.spec.ts`.

### Group A — hard bugs (wrong language / blank UI)

| Key | Old | New |
|---|---|---|
| `close` | `Close` | `إغلاق` |
| `plans.verse` | `verse` | `آية` |
| root `overline`, `title`, `tagline`, `recommendedSurahs`, `searchLabel`, `searchPlaceholder`, `searchClear`, `noMatches`, `verseSearchHint`, `viewingChipGeneric` | `""` (10 keys) | delete — live copies exist under `home.*` / `mushaf.viewingChipGeneric` |

### Group B — grammar / spelling bugs

| Key | Old | New |
|---|---|---|
| `home.resultsCount` | `{count} نتيجة` | `{count, plural, zero {لا توجد نتائج} one {نتيجة واحدة} two {نتيجتان} few {{n} نتائج} many {{n} نتيجة} other {{n} نتيجة}}` |
| `search.resultsCount` | `عدد النتائج: {count}` | `{count, plural, zero {لا توجد نتائج} one {نتيجة واحدة} two {نتيجتان} few {{n} نتائج} many {{n} نتيجة} other {{n} نتيجة}}` |
| `plans.hero.streakDays` | `يوماً متتالياً` | `{count, plural, one {يوم واحد متتالٍ} two {يومان متتاليان} few {{n} أيام متتالية} many {{n} يومًا متتاليًا} other {{n} يوم متتالٍ}}` |
| `hizb-three-quarters` | `ثلاث أرباع الحزب` | `ثلاثة أرباع الحزب` |
| `swUpdate.dismiss` | `لاحقاً` | `لاحقًا` |
| `readerLab.viewportTooShort` | `جداً` | `جدًا` |
| `readerLab.presentationOnly` | `شيئاً` | `شيئًا` |
| `plans.custom.estimate.pace`, `plans.settings.autoWrite*`, `plans.startPoint.lockedNotice`, `plans.detection.autoWriteNotice*` | `تلقائياً` | `تلقائيًا` |
| `privacy.updated` | `آخر تحديث: سبتمبر 2026` | `آخر تحديث: سبتمبر ٢٠٢٦` |
| `offline.sizeNotice` | `حوالي {size} ميجابايت. يُفضّل عبر Wi-Fi.` | `حوالي {size} ميجابايت. يُفضّل عبر شبكة لاسلكية.` |
| `offlineTafsir.sizeMb`, `spaceAvailable` | `ميغابايت` | `ميجابايت` (unify on the `offline.*` spelling) |
| `plans.dashboard.streaks.daysCount` zero | `ولا يوم` | `لم تبدأ بعد` (rest of categories unchanged: `يوم واحد` / `يومان` / `{{n} أيام}` / `{{n} يومًا}` / `{{n} يوم}`) |
| `plans.dashboard.totals.pagesCount` zero | `ولا صفحة` | `لم تبدأ بعد` (rest unchanged) |
| `plans.dashboard.totals.versesCount` zero | `ولا آية` | `لم تبدأ بعد` (rest unchanged) |
| `plans.dashboard.totals.khatmatCount` zero | `ولا ختمة` | `لم تبدأ بعد` (rest unchanged; badge hidden at 0 anyway) |

### Group C — weak phrasing (each row independently vetoable)

| Key | Old | New | Why |
|---|---|---|---|
| `home.searchLabel` | `البحث التنقلي` | `البحث والتنقل` | `التنقلي` is not idiomatic MSA |
| `home.description` | `اقرأ واستمع إلى القرآن` | `اقرأ القرآن الكريم واستمع إليه` | add the honorific; smoother cadence |
| `settingsDescription` | `… والوصول دون اتصال.` | `… والقراءة دون إنترنت.` | `الوصول دون اتصال` is a literalism |
| `keepScreenAwake` | `الشاشة` | `الشاشة والإضاءة` | bare `الشاشة` is cryptic as a section label |
| `mushafLayout.title` | `تخطيط المصحف` | `طبعة المصحف` | `تخطيط` suggests planning; keys select a print edition |
| `markModal.linking` | `تربيط` | `الربط` | `تربيط` is colloquial; `الربط` matches the other nominal labels |
| `markModal.markWordLabel` | `تحديد كلمة` | `تعليم كلمة` | unify with `marks.emptyHint` (`علّم`) — `تحديد` means selecting |
| `markModal.markVerseLabel` | `تحديد آية` | `تعليم آية` | same as above |
| `markModal.signInToMark`, `signInModal.description` | `…لتحديد الكلمات والآيات…` | `…لوضع علامات على الكلمات والآيات…` | same `تحديد` → marking fix |
| `home.resumeReading` | `متابعة التلاوة` | `متابعة القراءة` | unify with `continueReading.navLink` (`متابعة القراءة`) |
| `plans.dashboard.subtitle` | `متابعة الاستمرار في التلاوة والاستماع والحفظ والمراجعة` | `تابع التزامك بالتلاوة والاستماع والحفظ والمراجعة` | `متابعة الاستمرار` is redundant |
| `plans.widget.open` | `أشّر ورد اليوم` | `سجّل إنجاز ورد اليوم` | explicit verb; `أشّر` is ambiguous |
| `plans.custom.rangeFrozen` | `تم تثبيت المقدار لتسجيل قراءات سابقة` | `تم تثبيت النطاق لتسجيل قراءات سابقة` | the locked thing is the range (`النطاق`) |
| `recitation.listen` | `استماع` | `استمع` | buttons use imperatives (`أوقف`, `تابع`); unify |
| `recitation.nowPlaying` | `تلاوة` | `التلاوة جارية` | bare noun is terse as a player state |
| `recitation.offlineUnavailable` | `غير متاح دون اتصال` | `غير متاح دون إنترنت` | `دون اتصال` is vague |
| `markModal.playPronunciation` | `سماع النطق` | `استمع إلى النطق` | imperative verb like the sibling actions |

## Constraints

- `ar.json` must stay complete; `en.json` untouched (already complete and
  correct for these keys).
- New ICU messages use `{count numeric, n: localized-string}` — never format
  `#` directly (Western digits), per `docs/standards/i18n.md`.
- Do NOT run `npm run extract-translations` as part of this change — it
  rewrites unrelated drift hunks; hand-edit and verify with
  `npx vitest run app/components/plans/plans-ui.test.ts` plus
  `app/lib/notifications/render-context.test.ts` (regression guard).
- Validate the edited JSON parses and every new ICU message compiles (the new
  Vitest assertions do both).

## What NOT to Do

- Do not touch `plans.custom.*` values — locked by `plans-ui.test.ts`.
- Do not touch `notifications.types.*` — the `{{var}}` convention there is the
  intentional server-side template syntax of `render-context.ts:59`, covered
  by tests (an earlier review draft misflagged this; corrected here).
- Do not touch `en.json`, fonts, layout, or locale routing.
- Do not rename any key paths (except deleting the 10 empty root keys).
- Do not "fix" `plans.pages` / `plans.verses` (`صفحات` / `آيات`) — they are
  unit labels, not counts.

## Decisions Made

- Scope = Groups A+B+C together, per user approval (`توكل على الله`,
  2026-09-30); Group C rows are individually droppable on review.
- `area: i18n` mirrors `docs/architecture/decisions/i18n.md`. It is absent
  from the ADR 0059 vocabulary list (which also omits `notifications` and
  `sharing`, both already used as areas in active plans) — the list is stale;
  `i18n` follows the same precedent and the "mirrors decisions/ domains" rule.
- Correction recorded: `notifications.types.*` `{{name}}` / `{{n}}` /
  `{{start}}` placeholders are NOT broken — `buildRenderContext` does
  `replaceAll(`{{${name}}}`, …)` server-side and `render-context.test.ts`
  asserts rendered output (`تذكير: ختمة رمضان`). The review initially flagged
  these; verification against code + tests overturned it.
- `ميجابايت` chosen over `ميغابايت` (matches the larger `offline.*` section
  and Egyptian usage); `بتاريخ إتمام` kept (correct MSA, not changed).
- Class 3 narrowed during implementation: the enroll-form stepper suffix is a
  static unit label (no composed number), so top-level `plans.pagesPerDay` /
  `versesPerDay` stay and `PlanEnrollForm.tsx` is untouched; only the
  number-composing `getPlanPaceSummary` migrated (signature now takes
  values-capable `tIntl`; existing pace test updated, not deleted).
- Self-correction: restoring the top-level rate keys once created duplicate
  keys inside `quantityMode` (a mis-anchored edit); caught by the parity test,
  fixed, and verified duplicate-free by script before re-running tests.
- Tanween normalization widened during implementation: the file mixed
  Egyptian-style `اً` with standard `ًا` (23 occurrences in 15 keys, e.g.
  `يومياً`, `أيضاً`, `يوماً`); since alef+fathatan never occurs in standard
  MSA, all were normalized to `ًا` in one pass — same bug class as the listed
  spelling rows.
- Zero-progress wording (2026-09-30, user feedback on screenshot): the
  `ولا يوم` / `ولا صفحة` / `ولا آية` / `ولا ختمة` zero categories are
  colloquial fragments — and the streak card composes a standalone big numeral
  with the label, which is ungrammatical for every category. User rejected
  `لا أيام بعد` and chose `لم تبدأ بعد` for all four zero categories; the big
  numeral span is removed so `daysCount` is self-contained.

## Follow-up — agy linguistic review (2026-09-30)

Read-only review by `gemini-3.8-flash-medium` (via `agy-delegate`, `--read-only`;
report at `/tmp/agy-report.txt`) confirmed all Group A/B/C verdicts and found
14 further issues; every high-severity claim was re-verified against code
before fixing. User approved the mechanical batch plus five wording decisions.

- `plans.custom.*` dual-with-numeral (`two {{n} صفحتان/يوم}` …): our own
  Class-3 migration exposed this live in plan summaries. Fixed by dropping
  `{n}` from all `two` categories and using `واحدة`-forms for `one`
  (`pagesCount`, `versesCount`, `daysCount`, `pagesPerDay`, `versesPerDay`,
  `pagesPerWeek`, `estimate.days`); the `#610 polish` test block was updated
  to the new values (not deleted). This supersedes "What NOT to Do: do not
  touch `plans.custom.*` values" for these categories only.
- `plans.templates.listeningWird.description`: `وتدور الاستماع` →
  `ويدور الاستماع` (الاستماع masculine).
- `plans.hero.keepGoing` + dual case: `"على يومان"` is ungrammatical and the
  numeral removal broke English (`"day streak"` with no number). User chose
  `استمر — لقد حققت حتى الآن`; since `حقق` takes an accusative object, Site 1
  now uses a new accusative key `plans.hero.streakDaysAcc`
  (`يومًا واحدًا متتاليًا` / `يومين متتاليين` / …), Site 2 keeps nominative
  `streakDays`; `en.json` gained ICU `streakDays` +
  `streakDaysAcc` (`{count, plural, one {# day streak} other {# day streak}}`).
- `recitation.repeatCycleTimes` → ICU plural (`مرة واحدة` / `مرتين` /
  `{n} مرات` / `{n} مرة`); `RecitationPlayerBar.tsx` passes `count`;
  `en.json` mirrors with `once` / `{n} times`.
- `QuranSafha.tsx:520` hardcoded fallback → `ثلاثة أرباع الحزب`.
- `sidebar.filterResultsCount` one → `نتيجة واحدة` (matches new messages).
- `plans.settings.autoWriteTitle` → `التسجيل التلقائي للورد` (matches its own
  description and the `أشّر`→`سجّل` rationale).
- `plans.settings.autoWriteDescription`: second clause `التلاوة` →
  `الاستماع`.
- `privacy.s5b`: `أبدا` → `أبدًا`; `privacy.s4b`: `تلاوات الصوت` →
  `والتسجيلات الصوتية للتلاوة`; `privacy.s1b`: `دون اتصال تعمل` →
  `دون اتصال بالإنترنت يعمل` (gender fix included).
- `plans.actions.abandon`: user chose `إلغاء الخطة` over `ترك الخطة`.
- Offline standard (user chose `دون اتصال بالإنترنت`): normalized 15 keys
  across `offline.*`, `offlineTafsir.*`, `offlineRecitation.*`, `tafsir.*`,
  `settingsDescription`, `mushafLayout.activeNeedsDownload`,
  `recitation.offlineUnavailable`, `privacy.s1b`; imperative `اتصل بالإنترنت`
  and `عبر الإنترنت` constructions untouched. `offline-pwa.spec.ts` gate
  assertions updated; `/التلاوة دون اتصال/` regexes still match.
- `offline.sizeNotice` (user chose `واي فاي`): `يُفضّل التنزيل عبر شبكة
  واي فاي.` — supersedes the earlier `شبكة لاسلكية` choice.
- `hizb-full` deleted from `ar.json` (verified: ar-only key, zero code refs).
- Sweep correction #2: `offline-pwa.spec.ts` asserted the old gate title —
  updated. Its one eslint unused-import error is pre-existing (verified via
  stash on unmodified tree).
- CI follow-up (PR #745, e2e FAILURE): three failures were ours and fixed on
  the branch — `search-results-page.spec.ts` header regex matched the `h1`
  `نتائج البحث` (strict-mode violation; now exact `٤٨ نتيجة`),
  `sidebar-navigation.spec.ts` expected old `١ نتيجة` (now `نتيجة واحدة`),
  `offline-pwa.spec.ts` exact dialog names missed the longer standardized
  title (now `التلاوة دون اتصال بالإنترنت`). Seven other failures
  (recitation-lifecycle ×2, tafsir-sheet ×2, locale-switching, wird-reminder,
  offline-pwa audio-download ×3) reference no changed string — audio/external
  timing suspects, to be judged on the re-run.
- CI re-run (e2e FAILURE again) root-caused locally: Playwright `name`
  matching is exact/substring-sensitive and `استمع` ≠ `استماع` at codepoint
  level (alef 0627 present/absent), so renaming `recitation.listen` to the
  imperative orphaned every spec asserting the old label. All play-button
  assertions updated (`recitation-lifecycle` ×2, `tafsir-sheet` ×2,
  `locale-switching` ×1, `offline-pwa` ×6) plus `plans-custom-wird`
  `المقدار`→`النطاق`; `plans-layout` tabs left alone (activities.* nouns
  unchanged). Verified per-spec locally against prod build; `wird-reminder`
  passes locally → CI-only flake.
