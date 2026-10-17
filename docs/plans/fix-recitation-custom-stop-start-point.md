---
title: Fix Recitation Start Point Overwrite on Custom Stop Point Selection
type: bug
date: 2026-10-13
status: implemented
area: recitation
issue: 788
---

# Fix Recitation Start Point Overwrite on Custom Stop Point Selection

## Summary
When recitation is launched from Mark Modal at a specific verse and the user opens Recitation Settings to configure a custom stop point, the start point was either left as an abstract `current-verse` preset that drifts with playback or actively overwritten to match an earlier stop point due to the mutual push-apart logic in `CustomRangePicker` and coarse `pageToApproxSurah` boundaries. This fix exposes the launch verse from `RecitationContext`, seeds `startPoint` explicitly to that verse (`{ type: "verse", surah, ayah }`) in `RecitationSettingsSheet`, floors the custom stop picker (surah, ayah, and page) to never precede the start verse, and eliminates the backwards push that mutated the start point.

## Root Cause / Approach

### Root Cause
1. **Unexposed Launch Verse & Drifting Preset**: `RecitationContext` maintained `startVerseKeyRef` internally for repeats and restarts, but did not expose `startVerseKey` in `RecitationContextType`. In `RecitationSettingsSheet`, transitioning from idle to playing set `startPoint` to `{ type: "current-verse" }`. As audio progressed across verses, `referenceVerseKey` dynamically tracked `currentVerseKey`, causing the start point to drift away from the verse selected in Mark Modal. Furthermore, if playback was already active or paused when Mark Modal triggered `play()`, `wasIdle` evaluated to false, leaving `startPoint` un-updated.
2. **Mutual Push-Apart Overwriting Start**: When "Stop at" was switched to "Custom point", `CustomRangePicker` mounted and invoked `onChange` (`pushStartBeforeEnd`). Because `pushStartBeforeEnd` lowered `startPoint` whenever `curStartKey > nextEndKey`:
   - In page mode, `pageToApproxSurah` uses coarse chapter page spans; on pages containing multiple surahs (e.g. page 106, 596, 604) or when `referencePage` fell back behind the start verse, `nextEndKey` evaluated earlier than `curStartKey`, overwriting `startPoint`.
   - In verse mode, `LAST_VERSE_POINT_CACHE` preserved older choices across unmounts; if a user had previously picked an earlier verse, toggling to verse immediately fired `onChange` with that earlier verse and overwrote `startPoint`.
3. **Unbounded Dropdowns in Custom Stop Picker**: In `CustomRangePicker`, the Ayah `NumberCombobox` always presented `1..ayahCeil` without flooring to `startAyah` when `surah === startSurah`. Similarly, `SurahCombobox` and the page picker allowed selecting points earlier than the active start position.

### Approach
1. **Expose `startVerseKey` in `RecitationContext`**: Add `startVerseKey: string | null` to `RecitationContextType`. Update `startVerseKey` in state whenever `play(verseKey)` is called.
2. **Seed Start Point to Concrete Verse**: In `RecitationSettingsSheet`, when a session is active and `startVerseKey` (or `currentVerseKey`) is present, seed `startPoint` to `{ type: "verse", surah: S, ayah: A }` (parsed from the start verse key). This displays "Custom" under "Start from" with the exact surah and ayah pinned.
3. **Floor Custom Stop Point Picker**: In `CustomRangePicker`:
   - Surah dropdown: `minSurah = startSurah`.
   - Ayah dropdown: when `surah === startSurah`, options are filtered to `{ startAyah .. totalAyahs }`. When `surah > startSurah`, options are `{ 1 .. totalAyahs }`.
   - Page dropdown: options are filtered to `{ startPage .. MUSHAF_LAST_PAGE }`.
   - Any stale cached verse in `LAST_VERSE_POINT_CACHE` that precedes `startFloorKey` is ignored/reset so the initial stop point defaults to `>= startVerse`.
4. **Remove Backwards Push of Start Point**: In `pushStartBeforeEnd`, editing the Stop point must never push the Start point backwards. The Start point remains anchored to the chosen starting verse.
5. **Remove Redundant `current-verse` Preset**: Remove the `current-verse` preset option from the "Start from" radio group in `RecitationSettingsSheet`. In an idle reader, there is no active verse selection and `current-verse` redundantly fell back to the first verse of the page (`current-page`). During active playback, the launch verse is pinned explicitly under `Custom` (`{ type: "verse", surah, ayah }`). Start From now cleanly offers 4 presets: Current page, Start of surah, Start of rub', and Custom.
6. **TDD Unit Verification**: Author a comprehensive test suite in `app/components/RecitationSettingsSheet.test.tsx` verifying:
   - Launching recitation on a specific verse (e.g. `79:11`).
   - Opening settings and confirming Start From reflects `79:11`.
   - Changing Stop At to Custom Point (verse/page) and confirming Start From remains `79:11`.
   - Verifying stop point dropdowns disallow selecting verses preceding `79:11`.
   - Verifying Start From offers exactly the 4 presets and excludes `current-verse`.

## Decision Tree / Algorithm

### 1. Start Point Derivation in Settings Sheet
```
IF session is active (status !== "idle") AND startVerseKey is present:
    startPoint = { type: "verse", surah: parseChapter(startVerseKey), ayah: parseAyah(startVerseKey) }
ELSE IF status === "idle":
    startPoint = { type: "current-page" }
```

### 2. Custom Stop Point (`Stop >= Start`)

| Mode | Control | Behavior / Constraint |
|---|---|---|
| **Verse** | **Surah** dropdown | Restricted to `surah >= startSurah` (starting surah and any subsequent surah). |
| **Verse** | **Ayah** dropdown | If `selectedSurah === startSurah`, options are `{ startAyah .. totalVerses }`. If `selectedSurah > startSurah`, options are `{ 1 .. totalVerses }`. |
| **Verse** | **Default / Cache** | Initial verse must be `>= startVerse`. Any cached point preceding `startVerse` is cleared. |
| **Page** | **Page** dropdown | Options are `{ startPage .. 604 }`. Cannot select pages preceding the start page. |
| **All** | **Start Mutation** | Changing the stop point NEVER mutates `startPoint`. |

## Verified Test Cases

| Scenario | Input Start | Stop Selection | Expected Start Display | Expected Stop Constraints / Result |
|---|---|---|---|---|
| **1. Mark Modal launch on An-Nazi'at 11** | `79:11` | User opens settings and selects Stop at → Custom Point (Verse) | Custom: `An-Nazi'at 11` | Surah dropdown min `79`; Ayah dropdown min `11` for Surah 79; Start remains `79:11`. |
| **2. Change stop verse within same surah** | `79:11` | User selects Ayah `20` in Custom Point | Custom: `An-Nazi'at 11` | Stop is `79:20`. Start remains `79:11`. |
| **3. Change stop surah to subsequent surah** | `79:11` | User selects Surah `80` ('Abasa), Ayah `5` | Custom: `An-Nazi'at 11` | Stop is `80:5`. Start remains `79:11`. |
| **4. Multi-surah page launch** | `5:1` (Page 106) | User selects Stop at → Custom Point (Page) | Custom: `Al-Ma'idah 1` | Page options floored to `106..604`. Start remains `5:1`. |
| **5. Stale cache preceding start verse** | `2:50` (Cache has `1:7`) | User selects Stop at → Custom Point (Verse) | Custom: `Al-Baqarah 50` | Cached `1:7` discarded; stop point defaults to `≥ 2:50`. Start remains `2:50`. |

## Files to Change
- `app/contexts/RecitationContext.tsx` — expose `startVerseKey: string | null` in `RecitationContextType` and publish it on `play()`.
- `app/components/RecitationSettingsSheet.tsx` — initialize `startPoint` to `{ type: "verse", surah, ayah }` from `startVerseKey`, bound `CustomRangePicker` dropdown options by `startFloorKey`, discard out-of-bounds cache, and prevent `pushStartBeforeEnd` from lowering the start point.
- `app/components/RecitationSettingsSheet.test.tsx` — new unit test verifying the TDD scenario (start verse preservation, custom stop point configuration, dropdown constraints).

## Constraints
- Invariant: Quran page routes never get server-side dynamic rendering.
- Invariant: `commitTo` is the only in-reader navigation primitive.
- Recitation settings practice configuration (stop point, custom targets) must not leak to `localStorage` start points (`startPoint` is ephemeral and session-scoped per Addendum 12).
- Mutual push-apart forward constraint (`end >= start`) must be preserved without allowing backwards mutation of the start point during stop-point editing.

## What NOT to Do
- Do NOT persist `startPoint` to `localStorage` (Addendum 12 invariant).
- Do NOT allow the custom stop picker to display or select verses earlier than the starting verse.
- Do NOT allow editing the custom stop point to lower or change `startPoint`.
- Do NOT mutate `RecitationContext` audio playback timeline on settings sheet open.

## Decisions Made
- `startVerseKey` is explicitly surfaced on `RecitationContext` so consumers can identify the initial launch verse of the session.
- When recitation is launched at a specific verse, `startPoint` in `RecitationSettingsSheet` is pinned as a concrete `{ type: "verse", surah, ayah }` rather than the drifting `{ type: "current-verse" }`.
- Custom Stop point selection is strictly bounded to `Stop >= Start`. Editing Stop never mutates Start.
