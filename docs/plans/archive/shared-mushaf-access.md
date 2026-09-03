---
title: Shared Mushaf Access ("My teacher can access my mushaf")
type: feature
date: 2026-07-04
status: implemented
area: marks
adr: [0012]
---

# Shared Mushaf Access ("My teacher can access my mushaf")

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

The reader's viewport-fit math is `min-h-[calc(100dvh-3.5rem)]` and assumes **only** the 56px nav (ADR 0004/0011), so no stacked banner row. **Final form** (after four iterations — fixed pill → collapsible → inline expandable → static eye): `app/components/reader/ViewingChip.tsx` is a `size-4` static pulsing `Eye` (bespoke `flicker` keyframe in `tailwind.config.ts`, one dip per 3s, `motion-reduce:animate-none`) — **no interactivity, no visible label, no Exit link**. Owner name via `title`/`aria-label` only (`mushaf.viewingChip`). Rendered in `QuranSafha`'s header start cell when `grantId` is present; falls back to `mushaf.viewingChipGeneric` ("Viewing another user's mushaf") when the owner name is null/empty (gate on `grantId`, never on the name — an empty name must not drop the only grant indicator). Exit is via `SharedMushafLink` in the navbar. Component lives under `app/components/reader/` (imported by `QuranSafha`), not the grant route folder.

### Mark attribution (`MarkModal`)

When the opened spot's existing mark has `from_user !== viewer`, show a subtle
line under the title: small `User` icon + `t("markModal.markedBy", "Marked by")`
+ author name, `text-xs text-muted-foreground`. Unobtrusive; shows on the self
reader too (owner sees teacher-made marks attributed). No layout shift when absent.

### Navbar link

A single `app/components/nav/SharedMushafLink.tsx` in the Nav end cluster — ghost-idiom `Link` to `/mushaf`, `Users` icon, icon+label on desktop / icon-only on mobile (`hidden md:inline` on the label), visible signed-in or out. Not a `UserMenu` dropdown entry and not a `SettingsSidebar` entry — the two-surface approach was replaced by this one always-visible link.

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
- `app/[locale]/mushaf/page.tsx` — hub; also reads `searchParams.removed` and renders `AccessRemovedBanner` when `?removed=1`.
- `app/[locale]/mushaf/[grant]/layout.tsx` — grant guard: `if (!viewerId) redirect(`/${locale}`)` (logout → locale home, full reload so the theme applies); `if (!grantRecord || grantRecord.viewer_user !== viewerId) redirect(`/${locale}/mushaf?removed=1`)` (revoked/wrong-viewer → hub with banner, **not** `notFound()` — a layout `notFound()` renders the unthemed root 404).
- `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` — grant reader (no static params); resolves the owner name and passes `viewingOwnerName` to `ReaderPage` → `QuranSafha`.
- `app/not-found.tsx` — themed root 404: theme tokens (`bg-background`/`text-foreground`/`text-primary`), plain `<a>` links (not `next/link` — client nav from the root-layout 404 can arrive before the locale CSS chunk), a Shared Mushaf link. (`app/[locale]/not-found.tsx` only fires for `notFound()` in a *page*, not a layout.)
- `app/components/mushaf/AccessRemovedBanner.tsx` — **new**, dismissible, amber `AlertTriangle` style; generic copy ("You no longer have access to this mushaf." — no owner name; naming the owner in the wrong-viewer case leaks identity, ADR 0012). No "request access" button.
- `app/components/reader/ViewingChip.tsx` (client) — in-header `size-4` static pulsing eye; `ownerName?: string | null` with generic fallback; gate on `grantId`.
- `app/components/nav/SharedMushafLink.tsx` — **new**, single always-visible nav link (replaces the `UserMenu` + `SettingsSidebar` entries).
- `app/components/mushaf/*` — hub client sub-components: `GenerateCodeCard`, `RedeemCodeCard`, `AccessibleMushafList`, `GrantedViewersList` (+ shared empty-state/row bits).
- `app/hooks/use-access-grants.ts` — React Query: list grants, generate code, redeem code, revoke grant (invalidate on mutate).
- `app/server/actions/mushaf/*` — fetch wrappers for the `/api/mushaf/*` endpoints (mirror the `getPageMarks`/`addPageMark` style).
- `components/ui/input.tsx` — add via `npx shadcn@latest add input` if not present (redeem field).
- Navigation components (`NavigationArrow` in `pages/[id]/page.tsx`, `QuranSwipeNav`, `Sidebar`) — accept `readerBasePath`.
- `app/api/mushaf/grants/route.ts` + `app/server/actions/mushaf/accessGrants.ts` + hub list components — **do not** select or return `email` (ADR 0012: no email exposure).
- `app/api/mushaf/codes/redeem/route.ts` — redeem is transactional (`appPrisma.$transaction` wrapping the code-spend `updateMany` + the grant `upsert`), so a failed upsert never permanently strands a spent code.
- `app/middlewares/auth-middleware.ts` — set the trusted `user` token on the **request** headers passed into the handler (`new Headers(req.headers)` → `delete("user")` → `set("user", …)` → `NextResponse.next({ request: { headers } })`), never on the response header. A response header lets clients forge the `user` request header and leaks the token to the browser. Update DECISIONS.md "Auth" + ADR 0012 consequence.
- `app/api/mushaf/access.ts` — shared `upsertMark`/`deleteMark` helpers used by both the grant and self marks routes; `withAuthorNames` short-circuits (filter to foreign `from_user` ids, skip `user.findMany` when all marks are own — the common path on every page turn).
- `app/server/actions/mushaf/*` — the share-code action is `requestShareCode` (renamed from `generateShareCode` — collided with the crypto util in `app/utils/share-code.ts`).
- Grant marks route — `Number(context.params.pageId)` consistently (was mixing `parseInt`/`Number`).
- `messages/ar.json`, `messages/en.json` — `mushaf.*` (incl. `viewingChip`, `viewingChipGeneric`, `accessRemoved*`), `markModal.markedBy`.

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
- **The trusted `user` token is set on request headers, never response headers** — a response header is client-forgeable and leaks to the browser (Addendum 5 security fix; DECISIONS.md "Auth").
- **No `email` anywhere in the grant/hub surface** (ADR 0012).
- **The grant layout redirects, never `notFound()`s** — `!viewerId` → `/{locale}`, revoked/wrong-viewer → `/{locale}/mushaf?removed=1`. A layout `notFound()` renders the unthemed root 404.
- **`AccessRemovedBanner` copy is generic** — never names the owner (naming them in the wrong-viewer case leaks identity, ADR 0012).
- **`ViewingChip` is gated on `grantId`, not the owner name** — a null/empty name must not drop the indicator.

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
- **ViewingChip** (Addendum 1, after 4 iterations): a `size-4` static pulsing eye, no interactivity/label/Exit link; owner via `title`/`aria-label`; lives in `app/components/reader/`.
- **Navbar link** (Addendum 1): one always-visible `SharedMushafLink.tsx` in the Nav end cluster — not a `UserMenu`/`SettingsSidebar` pair.
- **Redeem is transactional; the `user` auth token is request-header-only; no email exposure; `requestShareCode` not `generateShareCode`; shared `upsertMark`/`deleteMark` helpers; `withAuthorNames` short-circuits** (Addendum 5).
- **Grant layout redirects (never `notFound()`); root 404 is themed; revoked viewer → hub `?removed=1` + generic `AccessRemovedBanner`** (Addenda 6, 7).

## What NOT to do

- Do not add a user-search / directory endpoint (privacy; out of scope).
- Do not add an approval/notification inbox — the code is the consent.
- Do not change the `Mark` unique key or add per-author mark stacking.
- Do not add relations between the new tables and `User`/`Mark`.
- Do not make `/[locale]/pages/[id]` dynamic or owner-aware.
- Do not trust the grant id from the URL without the server-side viewer check.
- Do not set the trusted `user` token on a **response** header — request headers only (forgeable + leaks otherwise).
- Do not `notFound()` from the grant layout — redirect (`app/[locale]/not-found.tsx` only catches page-level `notFound()`, not layout).
- Do not name the owner in `AccessRemovedBanner` or any wrong-viewer message (ADR 0012 identity leak).
- Do not gate `ViewingChip` on the owner name — gate on `grantId`.
- Do not give `ViewingChip` a label, Exit link, or any interactivity — the navbar `SharedMushafLink` is the exit.
- Do not select `email` in any grant/hub query or type.
- Do not add a "request access" button to the removed-access banner — there is no approval flow.

## Revision History

- 2026-07-05 — folded Addendum 1: `SharedMushafLink.tsx` replaces the `UserMenu` + `SettingsSidebar` two-surface link with one always-visible nav entry; `ViewingChip` **supersedes the base plan's interactive floating "Exit" chip** — after four iterations it is a non-interactive `size-4` pulsing eye in `QuranSafha`'s header, owner name via `aria-label` only, moved to `app/components/reader/`.
- 2026-07-05 — folded Addendum 5 (`/review-fq-work`): drop `email` from grant selects; transactional redeem; gate `ViewingChip` on `grantId` not owner name; **harden the `user` auth header to request-headers-only** (a response header is forgeable and leaks to the browser); rename `generateShareCode` → `requestShareCode`; extract shared `upsertMark`/`deleteMark`; short-circuit `withAuthorNames`; standardize `Number(pageId)`.
- 2026-07-05 — folded Addendum 6: logging out on a grant page 404'd (layout `notFound()` for unauthenticated). Fix: `if (!viewerId) redirect(`/${locale}`)`.
- 2026-07-05 — folded Addendum 7: reload after revocation showed an unstyled root 404. Fix: themed `app/not-found.tsx` (theme tokens, plain `<a>`); the grant layout redirects revoked/wrong-viewer to `/{locale}/mushaf?removed=1`, where the hub renders a generic dismissible `AccessRemovedBanner` (no owner name — ADR 0012).

