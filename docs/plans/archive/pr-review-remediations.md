---
title: PR Review Remediations for Feature 433
type: feature
date: 2026-08-29
status: implemented
area: workflow
---

# PR Review Remediations for Feature 433

## Summary

Remediate all findings identified in the Claude Sonnet 4.6 code review across correctness, code quality, plan consistency, and UX polish:
1. Fix translation merge artifacts in `messages/en.json` (`light`, `gold`, `dark` translations) and remove top-level empty keys.
2. Update `ThemeToggle.tsx` to use `t("light")`, `t("gold")`, `t("dark")` without unneeded fallback strings that pollute top-level key extraction.
3. In `app/components/nav/Sidebar.tsx`, make `onEscapeKeyDown` and `handleSearchKeyDown` explicitly check and set queries per active tab rather than through closure aliases.
4. In `app/components/nav/AyahPicker.tsx`, unify `navigate` helper, add `getDisplayName` helper, and add `active:scale-95 transition-transform` for tactile press states on ayah chips.
5. In `app/utils/nav-search.ts`, add safe optional chaining on `rub.rubVerseMappings?.[0]`.
6. In `e2e/tests/sidebar-navigation.spec.ts`, clean up `getFilterInput` selector to match only active placeholders.
7. Update completed plans in `docs/plans/` to `status: implemented`.

## Verification Plan

### Automated Tests
- `npm test`: Verify 128 unit tests pass.
- `npm run lint`: Verify ESLint and translation consistency.
- `npm run e2e:test -- e2e/tests/sidebar-navigation.spec.ts`: Verify all 54 sidebar E2E tests pass.
