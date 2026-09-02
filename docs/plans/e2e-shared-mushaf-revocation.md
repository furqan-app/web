# Complex E2E & Fix: Shared Mushaf Access & Mid-Session Revocation Navigation

**Type:** task  
**Date:** 2026-09-02  
**Status:** implemented  
**GitHub Issue:** [#469](https://github.com/furqan-app/web/issues/469)  
**Parent Epic:** [#466](https://github.com/furqan-app/web/issues/466)  
**ADR Reference:** [ADR 0012 — Shared mushaf access](../architecture/adr/0012-shared-mushaf-access.md)

## Summary

Implement a deterministic behavioral Playwright end-to-end test suite (`e2e/tests/shared-mushaf.spec.ts`), test fixture helpers (`e2e/helpers/mushaf.ts`), and harden active reader mid-session revocation handling along with personal widget isolation. The implementation verifies: (1) share code generation, self-redemption rejection, and redemption lifecycle on the hub (`/[locale]/mushaf`), (2) shared mushaf reader rendering with the `ViewingChip` indicator (named and generic fallbacks) and owner mark observation, (3) isolation of the personal daily awrad `PlansWidget` (suppressed when viewing another user's mushaf), (4) in-reader navigation integrity (sidebar surah/rub items and search results staying grant-prefixed via `useReaderBasePath()`), (5) multi-user mark editing and round-trip attribution ("Marked by {name}") in `MarkModal` under last-author-wins semantics, (6) graceful mid-session revocation redirection (when access is revoked while a viewer is actively reading, the next page turn, mark action, or sidebar navigation redirects cleanly to `/{locale}/mushaf?removed=1`), (7) generic `AccessRemovedBanner` presentation and query string dismissal without disclosing owner identity (ADR 0012), (8) owner-side UI revocation with confirmation prompts on the hub, (9) mobile long-press overlay interactions on shared mushaf pages, and (10) English (LTR) locale continuity and direct invalid-grant URL gating.

## Root Cause / Approach

1. **Client-Side Mid-Session Revocation Handling**:
   - `app/[locale]/mushaf/[grant]/layout.tsx` already guards initial/hard navigation and redirects invalid/revoked grants to `/${locale}/mushaf?removed=1`.
   - However, during active reading, `ReaderPager` uses client-side carousel navigation (`window.history.replaceState`), querying `/api/mushaf/[grantId]/pages/[pageId]/marks` on each page change.
   - When an owner revokes a grant mid-session, the marks API returns `403 Forbidden` (`{ code: 403, success: false }`), but `getPageMarks` and `addPageMark`/`deletePageMark` previously caught non-success and silently returned empty results.
   - **Fix**: When `grantId` is present and an API response returns `403 Forbidden`, trigger a client-side redirect (`window.location.replace(`/${locale}/mushaf?removed=1`)`) so the viewer is immediately returned to the hub with the `AccessRemovedBanner`.

2. **Personal Awrad `PlansWidget` Isolation**:
   - `PlansWidget` currently checks `useIsReaderRoute()`, which tests `pathname.includes("/pages/")` and therefore evaluates to `true` on `/mushaf/[grant]/pages/[id]`.
   - This caused the viewer's own personal awrad tracker (the floating circular progress badge) to render while reading someone else's mushaf.
   - **Fix**: Exclude shared mushaf routes (`pathname.includes("/mushaf/")`) in `PlansWidget.tsx`, ensuring personal awrad widgets only display on the self-reader.

3. **E2E Test Helpers & Fixtures (`e2e/helpers/mushaf.ts`)**:
   - Provide database helpers to seed secondary test users (`id: 2`, "Viewer Student"), create/delete `MushafAccessGrant` records, and clean up test share codes and grants in `furqan_app_e2e`.

4. **Playwright E2E Suite (`e2e/tests/shared-mushaf.spec.ts`)**:
   - Comprehensive multi-user journey testing code generation, redemption, reader viewing, mark attribution, mid-session revocation page-turn redirection, banner dismissal, and route security.

## Decision Tree / Algorithm

### Shared Mushaf Navigation, Attribution & Revocation State Machine

| Trigger / Context | State & Condition | Handling Component / Action | Expected Result / Navigation |
|---|---|---|---|
| **Signed-Out Request** | Visitor not authenticated | `[grant]/layout.tsx` (`!viewerId`) | Redirect to `/{locale}` (Home) |
| **Invalid Grant on Load** | `grantId` missing or foreign | `[grant]/layout.tsx` (`!grantRecord \|\| grant.viewer !== viewerId`) | Redirect to `/{locale}/mushaf?removed=1` |
| **Valid Grant Reader** | `grant.viewer_user === viewerId` | `[grant]/layout.tsx` & `QuranSafha` | Renders `ViewingChip`, owner marks; suppresses personal `PlansWidget` |
| **In-Reader Page Turn** | Grant active | `ReaderPager.commitTo` | URL updates to `/mushaf/[grant]/pages/[target]`, loads grant marks |
| **Sidebar / Search Link Click** | Inside shared mushaf | `useReaderBasePath()` | Href is `/mushaf/[grant]/pages/[target]` — stays inside grant reader |
| **Page Turn Post-Revocation** | Grant revoked during session | `getPageMarks(page, grantId)` receives 403 | Client redirect to `/{locale}/mushaf?removed=1` |
| **Sidebar Nav Post-Revocation** | Grant revoked during session | Router navigation to `/mushaf/[grant]/pages/X` | Server layout catches missing grant -> redirect to `/{locale}/mushaf?removed=1` |
| **Mark Action Post-Revocation** | Grant revoked during session | `addPageMark` / `deletePageMark` receives 403 | Client redirect to `/{locale}/mushaf?removed=1` |
| **Hub Banner Dismissal** | On `/mushaf?removed=1` | Click Dismiss (<kbd>X</kbd>) on `AccessRemovedBanner` | Banner hides; `router.replace(pathname)` strips `?removed=1` |
| **Self-Redemption Attempt** | Owner enters own share code | `POST /api/mushaf/codes/redeem` (`owner === viewer`) | Blocked with 422 error; no grant created |
| **Owner Hub Revocation** | Owner removes viewer on `/mushaf` | `DELETE /api/mushaf/grants/[grantId]` with confirmation | Row removed in-place; viewer access revoked |
| **Multi-User Mark Edit** | Viewer modifies owner's mark | `POST /api/mushaf/[grantId]/pages/[page]/marks` | Updates row (`to_user=owner, from_user=viewer`); owner sees "Marked by Viewer" |

## Verified Test Cases

1. **Hub Share Code Flow & Self-Redemption Gating**:
   - Target: `/ar/mushaf` as Owner (`id: 1`).
   - Action: Click "Generate code" -> copy code.
   - Action: Owner pastes own code into "Access someone's mushaf" and clicks "Redeem".
   - Assert: Error message displays ("لا يمكنك استخدام رمز المشاركة الخاص بك" / "You cannot redeem your own code").
   - Target: `/ar/mushaf` as Viewer (`id: 2`).
   - Action: Enter code in "Access someone's mushaf" -> Click "Redeem".
   - Assert: Grant row appears under "Mushafs I can access" with "Open" link (`/ar/mushaf/[grantId]/pages/1`); Owner's hub shows viewer under "People who can access my mushaf".

2. **Shared Mushaf Reading & Personal Widget Suppression**:
   - Target: `/ar/mushaf/[grantId]/pages/1` as Viewer (`id: 2`).
   - Assert: Header start cell contains `ViewingChip` with tooltip "تتصفح مصحف E2E Test User".
   - Assert: Personal `PlansWidget` (floating awrad bubble) is not rendered / `null`.
   - Assert: Owner's marks on page 1 are rendered with proper category highlights.

3. **In-Reader Navigation & Base Path Derivation**:
   - Target: `/ar/mushaf/[grantId]/pages/1` as Viewer.
   - Action: Open Sidebar (`open navigation`) -> Click Surah Al-Baqarah (`SurahListItem`).
   - Assert: URL updates to `/ar/mushaf/[grantId]/pages/2` (stays grant-prefixed).
   - Action: Open global SearchBar -> Search "الحمد" -> Click result for verse 1:2.
   - Assert: Navigates to `/ar/mushaf/[grantId]/pages/1`.

4. **Multi-User Mark Creation, Attribution & Round-Trip**:
   - Target: `/ar/mushaf/[grantId]/pages/1` as Viewer.
   - Action: Click word `1:1:1` (previously marked by Owner as `forgetting`) -> Change category to `similar` -> Save.
   - Assert: Word highlight changes to `bg-orange-300`; re-opening `MarkModal` displays "Marked by Viewer Student".
   - Target: `/ar/pages/1` as Owner (`id: 1`).
   - Assert: Owner opens personal reader and observes `similar` mark on `1:1:1`; clicking word opens `MarkModal` showing "Marked by Viewer Student".

5. **Mid-Session Revocation on Page Turn**:
   - Target: `/ar/mushaf/[grantId]/pages/1` as Viewer.
   - Action: Revoke grant in database (`DELETE FROM mushaf_access_grants WHERE id = ?`).
   - Action: Viewer flips page to page 2 (click forward arrow).
   - Assert: Browser cleanly redirects to `/ar/mushaf?removed=1`.
   - Assert: Generic `AccessRemovedBanner` ("لم يعد لديك حق الوصول إلى هذا المصحف.") is visible.
   - Assert: Owner name is not disclosed in the banner (ADR 0012).

6. **Mid-Session Revocation on Sidebar Navigation**:
   - Target: `/ar/mushaf/[grantId]/pages/1` as Viewer with grant revoked in DB.
   - Action: Open sidebar -> Click Surah Al-Baqarah.
   - Assert: Server layout catches revoked grant -> redirects cleanly to `/ar/mushaf?removed=1`.

7. **Owner Hub UI Revocation**:
   - Target: `/ar/mushaf` as Owner (`id: 1`) with active viewer grant.
   - Action: Click Trash icon on viewer row -> confirmation buttons appear ("Remove" / "Cancel") -> Click "Remove".
   - Assert: Viewer row is deleted in-place; empty state renders ("لا يوجد أحد لديه حق الوصول إلى مصحفك بعد").

8. **Banner Dismissal**:
   - Target: `/ar/mushaf?removed=1`.
   - Action: Click Dismiss (<kbd>X</kbd>).
   - Assert: Banner disappears; URL query string is cleared (`/ar/mushaf`).

9. **Generic ViewingChip Fallback**:
   - Condition: Grant with owner having `name: null` in DB.
   - Target: `/ar/mushaf/[grantId]/pages/1`.
   - Assert: `ViewingChip` renders with generic fallback tooltip "تتصفح مصحف مستخدم آخر" without layout shift.

10. **Mobile Long-Press on Shared Mushaf**:
    - Target: Mobile viewport (`390x844`), `/ar/mushaf/[grantId]/pages/1`.
    - Action: Long press on word `1:1:1` (600ms).
    - Assert: `MarkModal` opens with grant mark data and attribution.

11. **English (LTR) Locale Continuity**:
    - Target: `/en/mushaf/[grantId]/pages/1`.
    - Assert: LTR layout, `ViewingChip` has tooltip "Viewing E2E Test User's mushaf", English modal copy ("Mark word", "Marked by Viewer Student").
    - Action: Revoke grant and navigate -> redirects to `/en/mushaf?removed=1` showing English banner ("You no longer have access to this mushaf.").

12. **Direct Route & Auth Gating**:
    - Action: Signed-in user navigates directly to `/ar/mushaf/invalid-cuid/pages/1` -> redirects to `/ar/mushaf?removed=1`.
    - Action: Signed-out user navigates directly to `/ar/mushaf/[grantId]/pages/1` -> redirects to `/ar`.

## Files to Change

- `app/server/actions/getPageMarks.ts` — Detect `code === 403` when `grantId` is present and trigger client redirect to `/${locale}/mushaf?removed=1`.
- `app/server/actions/addPageMark.ts` — Detect 403 response on grant-scoped write and redirect to `/${locale}/mushaf?removed=1`.
- `app/server/actions/deletePageMark.ts` — Detect 403 response on grant-scoped delete and redirect to `/${locale}/mushaf?removed=1`.
- `app/components/plans/PlansWidget.tsx` — Suppress personal awrad widget when viewing shared mushaf routes (`pathname.includes("/mushaf/")`).
- `e2e/helpers/mushaf.ts` [NEW] — E2E database fixture helpers for seeding secondary users, creating access grants, revoking grants, and cleaning shared mushaf test data.
- `e2e/tests/shared-mushaf.spec.ts` [NEW] — Comprehensive Playwright functional test suite covering shared mushaf access, viewing chip, mark attribution, mid-session revocation redirection, and hub banner flows.
- `docs/architecture/decisions/marks.md` — Record client-side revocation redirection and personal awrad widget isolation invariants.

## Constraints

- Generic "access removed" copy only; never disclose owner names on revoked grants (ADR 0012).
- Server component guards must redirect (`redirect(...)`) rather than throwing unhandled exceptions.
- Never join Quran and App databases (ADR 0008).
- Keep `useMarks` query keys isolated per grant (`["/marks", pageKey, grantId ?? "self"]`).
- No visual screenshot pixel diffing (`toHaveScreenshot`).
- Authenticated E2E sessions must use signed JWTs via `authenticateAsUser`.

## What NOT to Do

- Do not show personal awrad/plans widgets or sync personal last-read page when viewing another user's mushaf.
- Do not disclose owner identities or private details when an access grant is revoked.
- Do not let 403 errors on grant marks fail silently leaving the viewer stranded on an unresponsive page.
- Do not bypass server layout guards by hardcoding client assumptions.

## Decisions Made

- Active reader mid-session revocation is detected immediately on the next page turn, mark mutation, or router navigation, and redirects the viewer to `/{locale}/mushaf?removed=1`.
- Personal awrad `PlansWidget` is strictly self-reader only and suppressed on `/mushaf/[grant]/pages/*`.
- Provide isolated secondary user fixtures (`id: 2`, "Viewer Student") in E2E helpers for multi-user test cases.
