---
title: Batch small fixes 630–635 (custom-wird range, husun label, endDate validation, e2e/docs alignment, dialog close label)
type: bug
date: 2026-09-14
status: ready-to-implement
area: awrad
issue: 630
adr: []
---

# Batch small fixes 630–635

## Summary

One PR fixing six small reported issues (#630–#635) that are each a few lines but span adjacent surfaces: two custom-wird form bugs (#630 invalid verse range + generic error), one untranslated English label (#631 husun), one missing server-side format check on the PATCH params-edit path (#632 endDate), two test-quality/doc-accuracy gaps (#633 disabled custom-wird e2e spec vs plan-doc claim; #634 reminder-spec gaps + wrong testids + missing English-locale coverage), and one site-wide a11y localization gap (#635 hardcoded English "Close" in Dialog/Sheet primitives). All six ship on one branch/PR because each is independently tiny and the caller explicitly requested a single PR.

Issues covered: #630, #631, #632, #633, #634, #635.

## Root Cause / Approach

- **#630 (CustomWirdForm verse-range reset + hidden error):** the "To surah" `onChange` (`CustomWirdForm.tsx` ~L714-717) does `setEndVerse({ surah: max(s, startVerse.surah), ayah: 1 })` without clamping `ayah` to `startVerse.ayah` when the surahs are equal (the mirror clamp already exists on the "From verse" stepper ~L696-701). The live estimate (`computeRangeTotalUnits`, `custom-wird-estimate.ts:130`) `Math.max(1, …)`-clamps negative spans to 1 so the UI looks valid, then `POST /api/plans` correctly 422s while `handleSubmit` (~L391-429) discards the server `message` (`enrollCustomPlan`/`updateCustomPlan` in `app/server/actions/plans.ts:124-155` return `null`/`false`, dropping the body). Fix: clamp `ayah` to `max(1, startVerse.ayah)` when `nextSurah === startVerse.surah`; thread the server's `message` through the actions/hooks into the form error banner with the generic `plans.enrollError` string kept strictly as fallback. No change to the estimate helper: after the clamp the UI cannot produce end-before-start through either surah handler or either ayah stepper (`NumberCombobox min` already floors the To-verse picker at `startVerse.ayah` when surahs match), so the display-only `Math.max` never masks a reachable state.
- **#631 (husun English label):** literal Arabic string in two places — `messages/en.json` `plans.templates.husun.label` and `app/constants/plan-ui.ts` `PLAN_TEMPLATE_UI.husun.defaultLabel`. Fix: English rendering in both. Decision: **"Al-Husun Al-Khamsa"** (transliteration, not "The Five Fortresses") to match the project's own English usage in `docs/architecture/decisions/plans.md` ("Al-Husun Al-Khamsa"). `messages/ar.json` stays untouched.
- **#632 (PATCH skips endDate validation):** `POST /api/plans` (`app/api/plans/route.ts:140-141`) gates `bodyParams.endDate` with `PLAN_DATE_RE`, but the PATCH params-edit path (`app/api/plans/[planId]/route.ts:213-225`) funnels through `resolvePlanParams` (`app/lib/plans/validate-params.ts:85-213`), which never inspects `params.endDate`. Fix: add the same `PLAN_DATE_RE` check on `params.endDate` inside `resolvePlanParams` so both routes validate identically. Implementer must first open both route files + `app/constants/plans.ts` to confirm the exact field path (`params.endDate` vs top-level) before coding — a confidently-wrong premise here ships a dead check.
- **#633 (disabled e2e spec vs false doc claim):** `e2e/tests/plans-custom-wird.spec.ts:13` is `describe.skip` with known selector/strict-mode issues; `docs/plans/610-custom-wird-ui.md` §3 "E2E Verification" presents it as delivered coverage. Fix is **docs-only**: rewrite that subsection to state the spec is currently disabled, why (strict-mode/selector issues noted in the spec's own TODO), what actually covers the feature today (colocated unit tests + manual browser verification), and what re-enabling requires. Do NOT un-skip or rewrite the spec in this PR — fixing its selectors needs an `e2e:serve` loop the implementer must not run (delegate verification loop forbids local e2e; CI owns it), and a half-fixed spec is worse than an honest doc.
- **#634 (reminder-spec gaps + wrong testids + en coverage):** confirmed against the shipped DOM: (a) the "Flow Tested" doc (`docs/plans/600-daily-wird-reminder.md` ~L1352-1375) names testids that do not exist — `wird-reminder-time-trigger-<slot>` (actual: bare `wird-reminder-time-trigger` for slot 1, `wird-reminder-time-trigger-slot-N` otherwise, `DailyWirdReminderSection.tsx:351-355`), `wird-reminder-add-slot` / `wird-reminder-remove-slot-<slot>` (actual: add button has NO testid at ~L440-449, remove button has only `aria-label` at ~L357-367), `plan-card-dedicated-toggle/-set` (actual: `dedicated-reminder-time-trigger-<planId>`, `MyPlansList.tsx:583`; set/remove buttons at ~L585-604 have no testids). (b) No multi-slot or dedicated-reminder test exists; (c) `plans-progress-dashboard.spec.ts` + `wird-reminder-settings.spec.ts` cover only `/ar`. Fix: add the three missing testids (`wird-reminder-add-slot`, `wird-reminder-remove-slot-<slot>`, plus a stable testid on the dedicated set/remove buttons — name them `plan-card-dedicated-set-<planId>` / `plan-card-dedicated-remove-<planId>`), correct the `600` doc's testid list + Flow Tested steps to the actual IDs, add one multi-slot add/remove e2e test and one dedicated-reminder set/persist e2e test using ONLY the actual IDs named here, and add `/en` mirrors for the dashboard spec and the reminder single-slot test. New specs follow existing file patterns verbatim (serial mode, `authenticateAsUser`/`clearUserPlans`/`createTestPlan` setup, unconditional assertions per `decisions/testing.md`).
- **#635 (Dialog/Sheet "Close" a11y name):** hardcoded `<span className="sr-only">Close</span>` in `components/ui/dialog.tsx:53` and `components/ui/sheet.tsx:93`. Constraint: `decisions/i18n.md` forbids `useTranslations` inside `components/ui/` primitives — so the fix is prop-based, not hook-based: add optional `closeLabel?: string` (default `"Close"`, preserving current output for any unmigrated caller) to `DialogContent` and `SheetContent`, render it in the `sr-only` span, add top-level `common.close` (`"Close"` / `"إغلاق"`) to `messages/en.json` + `messages/ar.json`, and pass `closeLabel={t("common.close", "Close")}` (or the caller's closest existing domain close key where one already exists) at every `<DialogContent>`/`<SheetContent>` call site (11 total per grep). No caller may be left rendering the default on a translated page out of convenience — the default exists only for backward compatibility.

## Decision Tree / Algorithm

- #630 To-surah handler: `next = max(s, startVerse.surah)`; `ayah = (next === startVerse.surah) ? max(1, startVerse.ayah) : 1`. All other handlers/steppers unchanged. Submit path: `serverMessage ?? t("plans.enrollError", fallback)` — the generic string remains iff the body carries no message (network failure, non-JSON).
- #631: both `messages/en.json → plans.templates.husun.label` and `plan-ui.ts → husun.defaultLabel` become `"Al-Husun Al-Khamsa"`. If any snapshot/unit test asserts the old Arabic default, update the expectation (the old value was the bug).
- #632: in `resolvePlanParams`, `if (params.endDate !== undefined && !PLAN_DATE_RE.test(params.endDate)) return { error: "Invalid params.endDate" }` — same regex object imported from `app/constants/plans`, same error-string style as siblings. Placement: alongside the other scalar params checks (near `startPage`/`targetStart`/`targetEnd`), before `return { params }`.
- #633: doc rewrite only; spec file untouched (stays skipped with its TODO intact).
- #634: additive testids only (no visual/DOM restructuring); doc testid table corrected to actuals; 2 new tests + en mirrors as above; no test may branch assertions on visibility (testing.md unconditional-assertion rule).
- #635: `closeLabel?: string = "Close"` on both primitives; `common.close` in both catalogues; all 11 call sites pass a translated label. If a call site already passes `hideDefaultClose`, it is out of scope (no close button rendered).

## Verified Test Cases

Walked against the issue repros (code-traced; browser/e2e verification is CI's on the PR, implementers do not run local e2e):

- #630: From 1:5, To-surah 2 → any (ayah 1, valid); To-surah back to 1 → To-verse becomes 1:5 (not 1:1), estimate shows ≥1 verse for a genuinely valid range, submit no longer 422s. Submit with any residual invalid range shows the server's message text, not only "Something went wrong".
- #631: `/en/plans` template row, My Plans list, and browse dialog show "Al-Husun Al-Khamsa" with the English description; `/ar/plans` unchanged (الحصون الخمسة).
- #632: `PATCH /api/plans/:planId` with `params.endDate: "garbage"` → 422 `Invalid params.endDate`; valid `YYYY-MM-DD` and omitted `endDate` pass as before; POST behavior unchanged.
- #633: `610` doc no longer claims live E2E coverage; spec remains skipped with accurate pointer.
- #634: new multi-slot test (add slot 2 → set 14:00 → remove → reload → only 08:30) and dedicated test (set 21:00 → badge visible → reload persists) use IDs present in the shipped components; `/en/plans` mirrors pass with Latin digits.
- #635: accessibility tree on `/ar/plans` announces "إغلاق" for dialog/sheet close buttons; `/en` announces "Close"; no `useTranslations` import appears under `components/ui/`.

## Files to Change

- `app/components/plans/CustomWirdForm.tsx` — To-surah clamp; error banner uses server message with generic fallback.
- `app/server/actions/plans.ts` (+ `app/hooks/use-plans.ts` if the return-type change requires it) — preserve the server `message` instead of collapsing to `null`/`false`.
- `messages/en.json` — husun label → "Al-Husun Al-Khamsa"; add `common.close`.
- `messages/ar.json` — add `common.close` (`إغلاق`); husun label untouched.
- `app/constants/plan-ui.ts` — `husun.defaultLabel` → "Al-Husun Al-Khamsa".
- `app/lib/plans/validate-params.ts` — `PLAN_DATE_RE` check on `params.endDate`.
- `docs/plans/610-custom-wird-ui.md` — E2E subsection corrected (disabled status, real coverage, re-enable criteria).
- `app/components/notifications/DailyWirdReminderSection.tsx` — add `wird-reminder-add-slot` + `wird-reminder-remove-slot-<slot>` testids (additive only).
- `app/components/plans/MyPlansList.tsx` — testids on dedicated set/remove buttons (additive only).
- `docs/plans/600-daily-wird-reminder.md` — testid list + Flow Tested corrected to shipped IDs.
- `e2e/tests/wird-reminder-settings.spec.ts` — multi-slot test + dedicated-reminder test + `/en` mirror(s).
- `e2e/tests/plans-progress-dashboard.spec.ts` — `/en` mirror coverage.
- `components/ui/dialog.tsx`, `components/ui/sheet.tsx` — `closeLabel` prop, rendered in `sr-only` span.
- ~11 `<DialogContent>`/`<SheetContent>` call sites — pass translated `closeLabel`.
- `app/components/plans/custom-wird-form.test.ts` / estimate tests — extend only if the clamp/message behavior is unit-coverable; update expectations that asserted the old buggy values.

## Constraints

- Two-DB split (ADR 0008): scalar Quran refs only; this batch needs no schema change — no migrations, no `prisma db push`, no seeders.
- 604 static pages stay static; no server-side dynamic rendering of page routes.
- i18n: every user-visible string through `messages/*.json` (no inline locale ternaries); full six-category ICU plurals where counting strings are touched (none expected here); primitives under `components/ui/` must NOT call `useTranslations` (prop-passing only); new `common.close` key must resolve in BOTH catalogues (key-resolution audit per decisions/i18n.md).
- Testing: e2e assertions unconditional (no `if (visible)` guards); locators by `data-testid`, never localized text; implementer does NOT run full `npm test`, `build`, or any local e2e — targeted `vitest` only for touched pure-logic specs; CI enforces the rest.
- PWA/offline: no service-worker or caching changes in this batch.
- Scope: no refactors, renames, or drive-by cleanup; Dialog/Sheet visual output unchanged (only the `sr-only` string becomes a prop with identical default).
- Commit boundary: implementer never runs `git add/commit/push` and never opens a PR — uncommitted tree only.
- Working language: surah (not chapter), verse (not ayah) in prose; match existing casing in code.

## What NOT to Do

- Do not change `computeRangeTotalUnits` math or add client-side range-invalid UI beyond the clamp + server-message surfacing (estimate helper stays display-only; rejected: turning it into a validator).
- Do not un-skip or rewrite `plans-custom-wird.spec.ts` (#633 is docs-only in this PR).
- Do not restructure reminder/dedicated UI to "fit" the doc's wrong testids — the doc is corrected to the DOM, not vice versa (except the three additive testids named above).
- Do not call `useTranslations` (or any i18n hook) inside `components/ui/*`; do not hardcode any other language's close string as a new default.
- Do not translate `messages/ar.json` husun label (it is already correct) and do not pick "The Five Fortresses" (superseded by the transliteration decision above).
- Do not add migrations, touch `prisma/`, run seeders, or mutate any database.
- Do not run `e2e:serve`, `e2e:build`, full `npm test`, or `npm run build` locally; do not commit or push.

## Decisions Made

- Single PR for all six issues per explicit caller request (deviation from `orchestrate.md`'s one-issue scope — this run acts as the batch consumer naming six issues up front; each issue still gets its own verification below).
- Unattended run per caller request: no socratic questions, no `fq-ask-human` (caller forbade it), no mid-run prompts; all scoping calls above are the orchestrator's and are recorded here for the PR reviewer. Open questions that would normally go to a human (label wording, docs-vs-spec for #633, prop-vs-hook for #635) were resolved against repo sources (`decisions/plans.md` English usage, testing-delegate e2e ban, `decisions/i18n.md` primitive rule) instead of escalation.
- One-task-per-brief preserved despite the single PR: implementation is split into sequential bounded dispatches (form+actions; i18n+validation+primitives; testids+docs+specs) against the same worktree, each re-verified before the next lands.
- Implementer lane: `opencode` free models only with highest-reasoning variants, named explicitly per dispatch (bypasses lane resolution per `delegate.md` Step 1); read-only review also via an `opencode` free model (not the fleet's `agy` second-opinion lane) to honor the caller's provider constraint.
- #633 resolved docs-side (honest disabled status) rather than spec-side; #634 resolved with additive testids + doc correction + new tests using verified actual IDs; #635 resolved prop-based per the primitives-must-not-translate invariant.
- Sweep (plan-task §3b): no existing passing test asserts the buggy behaviors as correct (implementer to confirm via grep for husun Arabic default, `endDate`-absent PATCH success, and "Close" `sr-only` expectations before finalizing); no service-worker paths touched; no offline-divergent signals (`useSession` untouched); every "unchanged" claim above names its file.
