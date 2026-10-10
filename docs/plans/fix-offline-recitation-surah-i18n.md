---
title: Fix untranslated surah list in Offline Recitation settings
type: bug
date: 2026-10-09
status: implemented
area: recitation
issue: 767
---

# Fix untranslated surah list in Offline Recitation settings

## Summary

The Offline Recitation sheet (Settings, installed PWA) renders its By Surah rows, its downloaded-item labels, and its juz download labels in hardcoded English even when the locale is `ar`. The fix makes all three locale-aware (`name_arabic` / `name_simple`, catalogue `juz` + `toLocaleNumeral`), following the exact pattern `RecitationSettingsSheet` / `CustomWirdForm` already use, and re-derives downloaded-item display labels at render time so old English-labelled registry entries and locale switches display correctly with no data migration.

## Root Cause / Approach

Root cause: three hardcoded-English label sites, no locale branch:

- `app/components/offline/OfflineRecitationSheet.tsx:207` passes `label={surah.name_simple}` for every By Surah row regardless of locale.
- `app/hooks/use-recitation-download.ts:114` builds the persisted surah label as `` `${reciterLabel} · ${surah.name_simple}` ``.
- `app/hooks/use-recitation-download.ts:152` builds the persisted juz label as `` `${reciterLabel} · Juz ${juzNumber}` `` (English word + Western digits).

The reciter half (`reciter.translatedName`) is already locale-aware — `fetchReciters(locale)` reads `public/quran/reciters-{ar,en}.json` — so only the surah/juz halves are wrong. The sheet's own juz *rows* are already correct (`t("juz")` + `toLocaleNumeral`, line 227); only the persisted juz *label* is wrong.

Approach: select the surah display name by locale at the call site (`locale === "ar" ? name_arabic : name_simple`, same as `RecitationSettingsSheet.tsx:174`, `CustomWirdForm.tsx:106`, `StartPointPicker.tsx:55`), pass locale-resolved display strings into the download functions for newly stored labels, and derive the Downloaded-section display label at render time from `(kind, key)` + live `chapters`/`reciters`/`locale` so pre-existing English labels self-heal and locale switches re-render correctly. Stored `RecitationDownloadItem` shape is unchanged; the persisted `label` becomes a fallback only.

## Decision Tree / Algorithm

Verified with the user (Arabic-only surah names; render-time re-derivation for old downloads):

- IF locale is `ar` AND row is a By Surah row THEN label is `surah.name_arabic`.
- IF locale is `en` AND row is a By Surah row THEN label is `surah.name_simple`.
- IF item is a downloaded surah THEN display is `{reciterTranslatedName} · {surahName(locale)}`, where `reciterTranslatedName` is the already-locale-aware `translatedName` from context and `surahName(locale)` resolves from live `chapters` by `item.key`.
- IF item is a downloaded juz THEN display is `{reciterTranslatedName} · {juzLabel(locale)}`, where `juzLabel(ar)` is `t("juz") + " " + toLocaleNumeral(key, "ar")` and `juzLabel(en)` is `t("juz") + " " + toLocaleNumeral(key, "en")`.
- IF the stored item's chapter cannot be resolved from live `chapters` (unknown id, data not yet loaded) THEN fall back to the persisted `item.label` verbatim (covers pre-existing entries and edge data gaps; never blank).
- New downloads store the locale-resolved display string in `label` (same derivation), so the fallback for future missing-data cases is already in the user's language.

No new translation keys. Surah names are data from `chapters.json`, not catalogue copy; only the `juz` word reuses the existing `t("juz")` key.

## Verified Test Cases

Walked through with the user against live data shapes (`chapters.json`, `reciters-{ar,en}.json`):

- By Surah row, locale `ar`, surah 1 THEN `الفاتحة` (from `name_arabic`); locale `en` THEN `Al-Fatihah` (from `name_simple`).
- Downloaded surah, locale `ar`, `{kind: "surah", key: 1, reciterId: 7}` with reciters-ar loaded THEN `مشاري راشد العفاسي · الفاتحة`; locale `en` THEN `Mishari Rashid al-`Afasy · Al-Fatihah`.
- Juz row and downloaded juz, locale `ar`, juz 1 THEN `جزء ١` (`t("juz")` = `جزء`, Eastern Arabic numeral); locale `en` THEN `Juz 1`.
- Legacy entry: stored `label` is `Mishari Rashid al-`Afasy · Al-Fatihah`, current locale `ar`, chapters loaded THEN display recomputes to `مشاري راشد العفاسي · الفاتحة`; stored value ignored.
- Missing-data fallback: stored entry references a chapter id absent from live `chapters` THEN display shows the persisted `item.label` unchanged (never blank, never throws).

## Files to Change

- `app/components/offline/OfflineRecitationSheet.tsx` — By Surah `Row` label becomes locale-aware (`locale === "ar" ? surah.name_arabic : surah.name_simple`); `downloadSurah`/`downloadJuz` call sites pass locale-resolved surah/juz display strings; Downloaded section renders a `getDisplayLabel(item)` derived from live `chapters`/`reciters`/`locale` with persisted-label fallback; juz display reuses existing `t("juz")` + `toLocaleNumeral` (same as line 227).
- `app/hooks/use-recitation-download.ts` — `performDownloadSurah`/`performDownloadJuz` accept the caller-resolved display name/label instead of hardcoding `surah.name_simple` / `"Juz ${n}"`; caching, reference-counted deletion, `PlaybackOverride` bounds, and registry shape untouched.
- `app/components/offline/OfflineRecitationSheet.test.tsx` (new, Vitest) — unit coverage for the label derivation: ar/en surah rows, ar/en downloaded surah + juz labels, legacy-English-label recompute in `ar`, missing-chapter fallback to stored label. Pure function extracted for testability (e.g. `formatOfflineDownloadLabel` colocated with the sheet or in `app/utils/recitation.ts`).

## Constraints

- Surah-name selection (`name_arabic` vs `name_simple`) is data selection, not catalogue copy — the "no inline locale ternaries" rule in `docs/architecture/decisions/i18n.md` targets user-facing copy in `messages/*.json`; this fix follows the established data pattern (`RecitationSettingsSheet`, `CustomWirdForm`, `StartPointPicker`). Juz word and numerals use the catalogue + `toLocaleNumeral` path, never hand-concatenated fixed plurals.
- Reuse existing keys only (`juz`, `offlineRecitation.*`); no new keys, so no `extract-translations` drift. Per `docs/standards/i18n.md`, placeholder-bearing keys must use `useTranslations` directly — this change adds no placeholders.
- Keep `RecitationDownloadItem` shape unchanged — no registry migration. Persisted `label` stays as fallback.
- Do not touch download caching, reference-counted page-asset deletion, bulk-preache sentinel logic, `PlaybackOverride` bounds, or the reciter-mismatch sync-then-play flow (ADR 0046).
- Reciter names need no change (already locale-aware via `reciters-{ar,en}.json`, ADR 0049).
- By Juz rows in the sheet are already correct; change only the persisted juz label + downloaded display.
- Accessibility/RTL: rows keep existing structure; Arabic labels render under the sheet's existing `dir={getLanguageDirection(locale)}`.

## What NOT to Do

- Do not add surah names as translation keys — they are `chapters.json` data, not catalogue copy.
- Do not migrate or rewrite the stored `recitationDownloads` registry — render-time derivation only.
- Do not store locale-at-download-time as the display truth (leaves legacy entries broken and goes stale on locale switch).
- Do not change the service-worker rules, bulk 604-page precache, Tajweed offline exclusion (ADR 0023), or the `DEFAULT_MUSHAF_ID` page-caching scope of downloads.
- Do not alter `ReciterCombobox`, reciter fetching, or the Downloaded section's Play/Delete behavior.

## Decisions Made

- User confirmed Arabic-only surah display (matches `RecitationSettingsSheet` and the rest of the reader), not a bilingual two-line row.
- User confirmed render-time re-derivation for downloaded items (heals legacy English labels, tracks locale switches) over keeping the stored label.
- No new ADR: the fix applies existing, documented patterns (locale-aware `name_arabic`/`name_simple` selection, `t("juz")` + `toLocaleNumeral`); no new invariant.
- Sweep (plan-task step 3b): no existing unit test asserts these labels (`grep` for `OfflineRecitation|use-recitation-download` hits only the sheet, hook, storage types, and `e2e/tests/offline-pwa.spec.ts` download-flow coverage — no label-language assertions, so no test invalidation); no service-worker change (no new `GET /api/*` reads; chapter/reciter data comes from precached static JSON); offline signal `isOnline` only gates button `disabled` state, unaffected; every "unchanged" claim above (SW, deletion, PlaybackOverride bounds, reciter flow) verified by reading the hook/sheet; no UI affordance is removed or relocated.
- Implementation note: the `PlaybackOverride` play labels (`handlePlay` + reciter-mismatch pending effect) use the same derived display label, so the settings-sheet "Playing" banner matches the Downloaded row — same helper, no new logic; bounds/reciter-sync flow untouched.
- Review follow-ups (all four addressed): juz branch guards out-of-range keys (1–30) with stored-label fallback; download buttons stay disabled until the selected reciter resolves (no empty-reciter stored label); row computations hoisted to single `const`s with a shared tested `surahDisplayName` helper; new tests cover the helper, the juz guard, and the fallbacks.
