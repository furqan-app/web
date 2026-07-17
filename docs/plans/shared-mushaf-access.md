# Shared Mushaf Access ("My teacher can access my mushaf")

**Type:** feature
**Date:** 2026-07-04
**Status:** implemented
**Trello:** https://trello.com/c/UhEDDKgA/41-my-teacher-can-access-my-mushaf
**ADR:** [0012 — Shared mushaf access](../architecture/adr/0012-shared-mushaf-access.md)

## Summary

Let any signed-in user grant another user access to view and edit the marks on
their mushaf. The owner generates a **one-time share code**; the other user
redeems it, which instantly creates a persistent access grant (the code is the
consent — no approval step, no user directory). Granted users open the mushaf at
a dedicated route and see/edit its marks, with every mark attributed to its
author so the owner can see who made each mark. "Teacher"/"student" are roles in
context only — there are no user types; any user can do either side.

## Approach

Built entirely in `furqan_app` (Quran DB untouched, ADR 0008). Reuses the
existing `Mark` model as-is: `from_user` = author, `to_user` = whose mushaf.
Only the access-control layer and the write path (which today hardcodes
`to_user = from_user = self`) are new.

### Data model (`prisma/app/schema.prisma`)

Two new models, scalar user refs only (no relations — matches `Mark`):

```prisma
model MushafShareCode {
  id          Int       @id @default(autoincrement())
  code        String    @unique          // random, url-safe, shown to owner to hand out
  owner_user  Int                        // who generated it (whose mushaf it unlocks)
  redeemed_at DateTime?                  // null until spent
  redeemed_by Int?                       // viewer who redeemed
  created_at  DateTime  @default(now())
  @@map("mushaf_share_codes")
}

model MushafAccessGrant {
  id          String   @id @default(cuid())  // random id used in the /mushaf/[grant] URL
  owner_user  Int                             // whose mushaf
  viewer_user Int                             // who may view/edit it
  created_at  DateTime @default(now())
  @@unique([owner_user, viewer_user])         // one grant per pair
  @@map("mushaf_access_grants")
}
```

Apply with `npm run app-db-push` (dev). **Do not** add relations to `User`/`Mark`.

### API routes

All new routes return the `jsonResponse()` envelope and read the user via
`extractUser(request)` (null-check → 401), per api-conventions.

- `app/api/mushaf/codes/route.ts`
  - `POST` — generate a one-time code for the caller. Creates `MushafShareCode`
    with a fresh random `code`, `owner_user = user.id`. Returns `{ code }`.
    (Optional: also `GET` to list the caller's unredeemed codes for display.)
- `app/api/mushaf/codes/redeem/route.ts`
  - `POST { code }` — look up an **unredeemed** code. Reject (422/404) if:
    missing, already redeemed, or `owner_user === user.id` (can't redeem own).
    Otherwise, in order: mark the code `redeemed_at/redeemed_by = user`, and
    upsert a `MushafAccessGrant(owner_user = code.owner_user, viewer_user = user.id)`
    (upsert so re-redeeming across a re-grant is idempotent). Return the grant id.
- `app/api/mushaf/grants/route.ts`
  - `GET` — the caller's two lists: grants where `viewer_user = self`
    (mushafs I can access — include owner display name + grant id) and grants
    where `owner_user = self` (people who can access mine — include viewer name).
- `app/api/mushaf/grants/[grantId]/route.ts`
  - `DELETE` — revoke. Allowed if caller is **either** the grant's `owner_user`
    (student removing a teacher) **or** its `viewer_user` (teacher dropping a
    student). Delete the grant.
- `app/api/mushaf/[grantId]/pages/[pageId]/marks/route.ts`
  - `GET/POST/DELETE` — grant-scoped mirror of the self marks route. First load
    the grant and **verify `grant.viewer_user === user.id`** (403 otherwise).
    Then operate with `to_user = grant.owner_user`, `from_user = user.id`. Same
    upsert/deleteMany logic as the self route, keyed on `to_user`.

**Middleware:** add `new RegExp("/api/mushaf/[^/]+/pages/[0-9]+/marks")` (and,
if we want them auth-gated at the edge, the other `/api/mushaf/...` routes) to
`protectedRoutes` in `app/middlewares/auth-middleware.ts`. At minimum the
grant-scoped marks route must be protected like the self marks route. The
grants/codes routes can be protected the same way or self-guard via
`extractUser` — protect them at the middleware for consistency.

### Marks author attribution ("see who made the mark")

- Extend **both** marks GET handlers (self + grant-scoped) to include `from_user`
  and resolve the author's display name (one `appPrisma.user.findMany` over the
  distinct `from_user` ids in the page's marks — no relation needed).
- `getPageMarks` (`app/server/actions/getPageMarks.ts`): carry `from_user` and
  `author_name` through the grouped shape (add fields; keep `name`/`value`/
  `marked_id` so `getColorMark` and current consumers are unaffected).
- `MarkModal`: when the opened spot has an existing mark whose `from_user` isn't
  the current viewer, show a small "Marked by {name}" line. Applies on the self
  reader too (student sees teacher-made marks attributed).

### Reader: grant-scoped mushaf view

Dedicated route tree mirroring `/[locale]/pages`:

- `app/[locale]/mushaf/[grant]/layout.tsx` — server layout. Load the grant,
  `setRequestLocale`, verify `grant.viewer_user === self` (redirect / notFound
  otherwise), fetch sidebar data (`getSurahs`, `getRubs`) like
  `pages/layout.tsx`, and render the `Sidebar` + a **"Viewing {owner}'s mushaf"**
  banner. Provide the reader base path to children.
- `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` — same body as
  `pages/[id]/page.tsx` (font `@font-face`/preload, `QuranSwipeNav`,
  `NavigationArrow`, `QuranSafha`) but **no `generateStaticParams`** (dynamic,
  per-grant) and passing a `grantId={grant}` down to `QuranSafha`.

**Threading the source.** Add an optional `grantId?: string` to `QuranSafha`.
Thread it into `useMarks(page, grantId)` and `MarkModal` → `addPageMark` /
`deletePageMark`, which choose the base path:
- self (no grantId): `/api/quran/pages/${page}/marks`
- grant: `/api/mushaf/${grantId}/pages/${page}/marks`

`getPageMarks`, `addPageMark`, `deletePageMark`, and `useMarks` gain an optional
`grantId` param; `useMarks` includes `grantId` in its React Query key so self
and viewed-mushaf caches don't collide.

**Link prefixing (do not skip — ADR 0012 trade-off).** In the grant page,
`NavigationArrow`, `QuranSwipeNav`, and the `Sidebar`'s page links must point at
`/${locale}/mushaf/${grant}/pages/...`, not `/${locale}/pages/...`. Introduce a
single `readerBasePath` value (`/${locale}/pages` vs
`/${locale}/mushaf/${grant}/pages`) computed in each page and passed to the
navigation components and the Sidebar. Verify at every breakpoint that arrows,
swipe, and sidebar navigation all stay inside the grant view.

### Hub page + navbar link

- `app/[locale]/mushaf/page.tsx` — the management hub (client-driven data via a
  small hook or server fetch). Sections:
  1. **Share my mushaf** — "Generate code" button → shows the one-time code to
     copy; optional list of active (unredeemed) codes.
  2. **Access someone's mushaf** — code input + "Redeem".
  3. **Mushafs I can access** — list from `grants` GET (viewer side); each links
     to `/${locale}/mushaf/${grant}/pages/1`.
  4. **People who can access my mushaf** — list (owner side); each with a
     "Remove" (revoke) action.
- Navbar: add a link to `/${locale}/mushaf` for signed-in users. Put it in the
  `UserMenu` dropdown (desktop) **and** ensure a mobile-reachable entry (UserMenu
  is `hidden md:flex` in `Nav`, so add the link to the mobile surface too — the
  `SettingsSidebar` sheet or a mobile menu — so mobile users aren't stranded).
  Confirm both breakpoints before calling it done (cf. DECISIONS "Sidebar
  Trigger" incident).
- i18n: add `ar` + `en` keys for all new copy (hub sections, banner, "Marked by",
  buttons, errors). Arabic must have coverage (default locale).

## Design

Load `docs/design/design-principles.md` + `docs/standards/styling.md` before any
UI work. Furqan is **manuscript-inspired, not a SaaS dashboard**. Every new
surface uses: the signature card shadow
`shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]`,
`rounded-[20px]` for primary cards / `rounded-xl` for secondary, the single
`primary` accent at low opacity (never a second accent), semantic tokens only
(no raw colors), `start`/`end` logical properties for RTL, and `lucide-react`
icons at `strokeWidth` 1.6–1.8. Use the custom `useTranslations` hook
(`t(key, default)` signature) and the locale-aware `Link` from `@/i18n/routing`.
For the final polish pass, run `/frontend-design`; for interaction states, run
`/ui-motion` (note: `tailwindcss-animate` is NOT installed — use Radix
`data-[state]` + `transition-*`, and `motion-reduce:`).

### Hub page (`/[locale]/mushaf`)

Standalone page under the global nav (like Home) — **not** the pages sidebar
layout. Server-component shell (`setRequestLocale`, `getTranslations`, heading),
rendering client sub-components for the dynamic lists (React Query). Container
`container mx-auto px-4 py-8 max-w-3xl`.

- **Page header**: manuscript header-band idiom — centred `◆ Title ◆`
  (diamonds `inline-block rotate-45 text-[6px] text-primary`), title in
  `font-tajawal font-extrabold`, a one-line muted tagline under it.
- **Section cards** (each a `bg-card` card with the signature shadow):
  1. **Share my mushaf** — the hero card; apply the **layered frame** (outer
     border + absolutely-positioned inner frame `inset-[10px] border
     border-primary/20 rounded-xl pointer-events-none`) and optional corner star
     ornaments to make it feel like a manuscript panel. Explains one-time codes,
     `Generate code` button (`bg-primary text-primary-foreground`, `active:scale`
     press per ui-motion). On generate, reveal the code in a bordered mono pill
     with a copy button (`Copy`→`Check` on success). Icon: `KeyRound` / `Share2`.
  2. **Access someone's mushaf** — secondary `rounded-xl` card: code `input`
     (`components/ui/input`) + `Redeem` button. Inline error (422/404) in
     `text-destructive`. Icon: `Ticket`.
  3. **Mushafs I can access** — rows (owner name + `Open` link → `/mushaf/
     [grant]/pages/1`). Empty state: muted `bg-muted` panel with a short line.
     Icon: `BookOpen`.
  4. **People who can access my mushaf** — rows (viewer name + created date +
     destructive-ghost `Remove` with a confirm step). Empty state. Icon: `Users`.
- Loading: skeleton/muted placeholders; never a bare spinner on the whole page.

### Viewing indicator (grant reader)

The reader's viewport-fit math is `min-h-[calc(100dvh-3.5rem)]` and assumes
**only** the 56px nav (ADR 0004/0011). Do **not** add a stacked banner row — it
would eat the safha budget and reintroduce scroll. Instead render a **floating
overlay chip**: fixed, top-centre (or top-`start`), `z`-above content,
`bg-card/95 backdrop-blur border shadow-sm rounded-full`, small `Eye` icon +
"Viewing {owner}'s mushaf" + an `X`/"Exit" link back to `/[locale]/pages/1` (or
Home). `pointer-events` only on the chip. RTL-aware placement.

### Mark attribution (`MarkModal`)

When the opened spot's existing mark has `from_user !== viewer`, show a subtle
line under the title: small `User` icon + `t("markModal.markedBy", "Marked by")`
+ author name, `text-xs text-muted-foreground`. Unobtrusive; shows on the self
reader too (owner sees teacher-made marks attributed). No layout shift when absent.

### Navbar link

Follow the existing nav ghost-icon idiom (like the sidebar trigger / settings),
not the circular page-nav buttons (those are reading-view only). Icon: `Users`.
- **Desktop**: an entry in `UserMenu` dropdown (and/or an icon-link in the nav end
  cluster), signed-in only.
- **Mobile**: `UserMenu` is `hidden md:flex`, so add a reachable entry on the
  mobile surface too — in `SettingsSidebar` near `AccountCard`. Verify both
  breakpoints have access (cf. DECISIONS "Sidebar Trigger" incident).

## Build Order (phased — mirrors the Trello checklist)

**Phase 1 — Data + API.** Schema + `app-db-push`/`app-generate`; the five
`/api/mushaf/*` routes; middleware patterns; self-marks GET author attribution.
Backend verifiable via curl/Prisma Studio before any UI.

**Phase 2 — Reader plumbing.** `grantId` through marks actions/hook (+ query
key); `QuranSafha`/`MarkModal` threading + "Marked by"; `readerBasePath` through
nav components; the `/mushaf/[grant]` route (layout guard + sidebar + floating
chip + dynamic page). Verify a teacher can open and edit a student's mushaf.

**Phase 3 — Hub UI + navbar + i18n.** Hub shell + four section cards with their
client hooks; navbar links (desktop + mobile); ar/en keys +
`extract-translations`.

**Phase 4 — Polish + verify.** `/frontend-design` + `/ui-motion` pass; end-to-end
verify with two accounts (generate → redeem → view/edit → attribution → revoke)
across RTL, mobile, and dark; `npm run lint` + `npm run build`.

## Files to Change

- `prisma/app/schema.prisma` — add `MushafShareCode`, `MushafAccessGrant`; then `npm run app-db-push` + `npm run app-generate`.
- `app/api/mushaf/codes/route.ts` — generate (POST) [+ list GET].
- `app/api/mushaf/codes/redeem/route.ts` — redeem (POST) → grant.
- `app/api/mushaf/grants/route.ts` — list both directions (GET).
- `app/api/mushaf/grants/[grantId]/route.ts` — revoke (DELETE).
- `app/api/mushaf/[grantId]/pages/[pageId]/marks/route.ts` — grant-scoped marks GET/POST/DELETE.
- `app/api/quran/pages/[pageId]/marks/route.ts` — GET now returns `from_user` + author name.
- `app/middlewares/auth-middleware.ts` — add `/api/mushaf/...` protected patterns.
- `app/server/actions/getPageMarks.ts` / `addPageMark.ts` / `deletePageMark.ts` — optional `grantId`; carry author fields in getPageMarks.
- `app/hooks/use-marks.ts` — optional `grantId`, include in query key.
- `app/components/QuranSafha.tsx` — accept + thread `grantId`.
- `app/components/MarkModal.tsx` — thread `grantId`; render "Marked by {name}".
- `app/[locale]/mushaf/layout.tsx`? (only if the hub needs the shell) / `app/[locale]/mushaf/page.tsx` — hub.
- `app/[locale]/mushaf/[grant]/layout.tsx` — grant guard + sidebar + banner.
- `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` — grant reader (no static params).
- `app/components/reader/ViewingChip.tsx` (client) — in-header viewing-indicator eye (moved from `[locale]/mushaf/[grant]/` — see Addendum 3).
- `app/components/mushaf/*` — hub client sub-components: `GenerateCodeCard`, `RedeemCodeCard`, `AccessibleMushafList`, `GrantedViewersList` (+ shared empty-state/row bits).
- `app/hooks/use-access-grants.ts` — React Query: list grants, generate code, redeem code, revoke grant (invalidate on mutate).
- `app/server/actions/mushaf/*` — fetch wrappers for the `/api/mushaf/*` endpoints (mirror the `getPageMarks`/`addPageMark` style).
- `components/ui/input.tsx` — add via `npx shadcn@latest add input` if not present (redeem field).
- Navigation components (`NavigationArrow` in `pages/[id]/page.tsx`, `QuranSwipeNav`, `Sidebar`) — accept `readerBasePath`.
- `app/components/nav/UserMenu.tsx` + `app/components/SettingsSidebar.tsx` (mobile surface) — "Shared mushaf" link, signed-in only.
- `messages/ar.json`, `messages/en.json` — new keys (`mushaf.*`, `markModal.markedBy`).

## Constraints (discovered)

- **No relations / no cross-domain FK.** New tables reference `User`/`Mark` by
  scalar `Int` id only (ADR 0008). Resolve author names with a separate
  `appPrisma.user.findMany`.
- **Grant id is not a capability.** Re-verify `grant.viewer_user === self` in
  every grant-scoped endpoint and in the `/mushaf/[grant]` layout — a guessed id
  must not grant access.
- **`Mark` unique key unchanged.** `[marked_type, marked_id, mark_type, to_user]`;
  last author wins. Do not add `from_user` to the key (user chose shared-mark
  semantics, not per-author stacking).
- **`jsonResponse()` + `extractUser` null-check** on every new route; 422 on
  missing fields (api-conventions).
- **Reader nav must stay grant-prefixed** or navigation silently escapes to the
  viewer's own mushaf. Verify arrows, swipe, and sidebar.
- **Static self-reader untouched.** The grant reader is a separate dynamic route;
  do not add dynamic rendering or `grantId` handling to `/[locale]/pages/[id]`
  (Static Generation Strategy).

## Decisions Made (from planning Q&A)

- **Discovery:** owner-issued share code, not a user directory/search.
- **Consent:** redeeming the code grants access immediately (no approval inbox).
- **Codes:** one-time (spent on redemption); owner generates a fresh one per person.
- **Revocation:** owner can revoke any viewer; viewer can drop themselves. Immediate.
- **Marks on the same spot:** one shared mark, last author wins (no schema change);
  author (`from_user`) is displayed so the owner sees who made each mark.
- **Viewer entry:** dedicated `/mushaf/[grant]/pages/[id]` route (not a `?owner=`
  param on the self reader).
- **Powers:** granted viewer can view **and** edit marks (writes attributed to them).

## Addendum 1 — Navbar link: single always-visible entry + ViewingChip evolution (2026-07-05)

**Navbar link (shipped):** Replace the two-surface link (UserMenu dropdown + SettingsSidebar) with a single `SharedMushafLink.tsx` in the Nav end cluster — ghost-idiom `Link` to `/mushaf`, `Users` icon, icon+label on desktop / icon-only on mobile (`hidden md:inline`), visible signed-in or out. Remove the link from `UserMenu.tsx` and `SettingsSidebar.tsx`.

**ViewingChip final state (after 4 iterations: fixed pill → collapsible → inline expandable → static eye):** `app/components/reader/ViewingChip.tsx` is a `size-4` static pulsing eye (bespoke `flicker` keyframe in `tailwind.config.ts` — a single dip per 3s cycle, `motion-reduce:animate-none`), no interactivity, no label, no Exit link. Owner name via `title`/`aria-label` only (`mushaf.viewingChip`: "Viewing {name}'s mushaf" / "تتصفح مصحف {name}"). Rendered in `QuranSafha`'s header start cell when `viewingOwnerName` is set; self reader has no chip. Exit available through `SharedMushafLink` in the navbar.

Component location: moved from `app/[locale]/mushaf/[grant]/ViewingChip.tsx` → `app/components/reader/ViewingChip.tsx` (reader component, imported by `QuranSafha`). Grant `layout.tsx` no longer renders it; grant `pages/[id]/page.tsx` resolves the owner name and passes it as `viewingOwnerName` to `ReaderPage` → `QuranSafha`.

## Addendum 5 — Review fixes from /review-fq-work (2026-07-05)

**Security:**
1. Drop `email` from `grants/route.ts` select (ADR 0012: "no email exposure") — remove from `GrantUser` type and hub list components.
2. Make redeem transactional — `appPrisma.$transaction` wrapping `updateMany` (spend) + `upsert` (grant) so a failed upsert doesn't permanently strand a spent code.
3. Gate `<ViewingChip>` on `grantId` (not `viewingOwnerName`) — a null/empty owner name shouldn't drop the only grant-view indicator. `ViewingChip` gets `ownerName?: string | null`; falls back to `mushaf.viewingChipGeneric` ("Viewing another user's mushaf").
4. **Harden the `user` auth header** — `auth-middleware.ts` was setting the trusted token on the response header; handlers reading it from the request means (a) clients could forge a `user` request header and (b) the token leaked to the browser. Fix:
   ```ts
   const requestHeaders = new Headers(req.headers);
   requestHeaders.delete("user");
   requestHeaders.set("user", JSON.stringify(token));
   return middleware(req, event, NextResponse.next({ request: { headers: requestHeaders } }));
   ```
   Update DECISIONS.md "Auth" section + add consequence to ADR 0012.

**Code quality:**
5. Rename `generateShareCode` action → `requestShareCode` (name collision with the crypto util in `app/utils/share-code.ts`).
6. Extract `upsertMark`/`deleteMark` shared helpers to `app/api/mushaf/access.ts`; both marks routes use them. Grant route keeps its `getGrantForViewer` pre-check; self route keeps `to_user = from_user = self`.
7. Short-circuit `withAuthorNames` — filter to foreign `from_user` ids only; skip the `user.findMany` entirely when all marks are own (common path on every page turn).
8. Standardize `Number(context.params.pageId)` in grant marks route (was mixing `parseInt`/`Number`).

**Files to change:** `grants/route.ts` (#1), `accessGrants.ts` (#1, #5), hub list components (#1), `redeem/route.ts` (#2), `page.tsx` (#3), `QuranSafha.tsx` (#3), `ViewingChip.tsx` (#3), `auth-middleware.ts` (#4), `access.ts` (#6, #7), grant marks route (#6, #8), self marks route (#6), messages (#3), `DECISIONS.md` + ADR 0012 (#4).

## Addendum 6 — Logout on a grant page 404s (2026-07-05)

**Bug:** Logging out while on `/{locale}/mushaf/{grant}/pages/{n}` showed a bare 404. Root cause: the grant layout called `notFound()` for unauthenticated users; on logout `signOut()` reloads the grant URL, finds no session, and `notFound()` renders the **root** `app/not-found.tsx` (above `[locale]`, no theme providers). The colorless home was a side effect of this root 404 on soft-nav — not a theme bug.

**Fix:** `app/[locale]/mushaf/[grant]/layout.tsx` — distinguish unauthenticated from wrong-viewer:
```ts
if (!viewerId) redirect(`/${locale}`);          // logout → locale home (full reload → theme applied)
if (!grantRecord || grantRecord.viewer_user !== viewerId) notFound(); // genuine 404
```

## Addendum 7 — Revoked access shows unstyled 404 (2026-07-05)

**Bug:** Reload after grant revocation shows a bare, unstyled 404. Root causes: (1) grant layout called `notFound()` on missing/wrong-viewer; (2) all `notFound()` calls (and unmatched URLs) route to the **root** `app/not-found.tsx` above `[locale]` — no theme providers, no app CSS. Note: `app/[locale]/not-found.tsx` only fires for `notFound()` in a *page*, not a layout — the root file must be fixed.

**Fix A — Themed root 404:** Rewrite `app/not-found.tsx` to use theme tokens (`bg-background`/`text-foreground`/`text-primary`) and plain `<a>` links (not `next/link` — client nav from the root-layout 404 can arrive before the locale CSS chunk loads). Add a Shared Mushaf link with the `◆` header treatment.

**Fix B — Revoked viewer → hub with banner:** Replace `notFound()` on missing/wrong-viewer with:
```ts
redirect(`/${locale}/mushaf?removed=1`);
```
Hub reads `searchParams.removed` and renders a dismissible `AccessRemovedBanner` ("You no longer have access to this mushaf." — generic, no owner name: row is deleted on revoke; naming the owner in the wrong-viewer case would leak identity per ADR 0012). Hub is the right landing: shows current access, where user would redeem a new code.

**Files:** `app/not-found.tsx` (Fix A), `[grant]/layout.tsx` (Fix B redirect), `mushaf/page.tsx` (render banner), `AccessRemovedBanner.tsx` (new, dismissible, amber `AlertTriangle` style), messages, DECISIONS.md + COMPONENTS.md. No "request access" button — no approval flow in ADR 0012.

## What NOT to do

- Do not add a user-search / directory endpoint (privacy; out of scope).
- Do not add an approval/notification inbox — the code is the consent.
- Do not change the `Mark` unique key or add per-author mark stacking.
- Do not add relations between the new tables and `User`/`Mark`.
- Do not make `/[locale]/pages/[id]` dynamic or owner-aware.
- Do not trust the grant id from the URL without the server-side viewer check.
