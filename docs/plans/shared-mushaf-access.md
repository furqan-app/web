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

## Addendum 1 — Navbar link placement + ViewingChip mobile fix (2026-07-05)

Post-implementation feedback from testing:

**1. Move the "Shared mushaf" link into the navbar itself (one place).**
The link was in two mobile/desktop surfaces (UserMenu dropdown + SettingsSidebar
sheet), both signed-in only. Replace both with a single always-visible entry in
the `Nav` end cluster:
- New `app/components/nav/SharedMushafLink.tsx` — ghost-idiom `Link` to `/mushaf`,
  `Users` icon, **icon + label on desktop, icon-only on mobile** (`hidden md:inline`
  label). Visible **signed in or out** — the `/mushaf` page already renders the
  sign-in prompt for signed-out users, which is the desired behaviour.
- Render it in `Nav.tsx` end cluster (before `UserMenu`/`SettingsSidebar`), all
  breakpoints.
- **Remove** the link from `UserMenu.tsx` (drop the `DropdownMenuItem` + now-unused
  `Users`/`Link`/`useLocale` imports) and from `SettingsSidebar.tsx` (drop the
  account-section `Link` + now-unused `useSession`/`Users`/`Link`/`SheetClose`).

**2. ViewingChip wraps to two lines and crowds the nav on mobile.**
The centred pill let its text wrap ("تعرض مصحف" + a long name), producing a tall
two-line pill that visually collides with the top nav controls. Fix in
`ViewingChip.tsx`: keep it a single-line pill — `whitespace-nowrap`, constrain the
owner name with `truncate min-w-0`, mark the icon/separator/exit `shrink-0`, and
cap the wrapper `max-w-[calc(100vw-1.5rem)]` so it never exceeds the viewport.
Position (top-[4.25rem], below the 56px nav) is unchanged; single-line restores the
intended clearance.

## Addendum 2 — Collapsible ViewingChip (2026-07-05)

Redesign the viewing indicator from an always-open pill to a **collapsible**
control, better suited to the reading-first surface:

- **Collapsed by default**: a small pulsing `Eye` circle (`size-9`). The pulse is
  a calm ~2s breathing ring (`animate-pulse` on an inset `ring-primary/50` span),
  static under `motion-reduce:animate-none`.
- **Tap to expand**: reveals "Viewing {name}" + Exit link. The reveal animates
  width via the `grid-cols-[0fr]→[1fr]` + `overflow-hidden` technique (smooth,
  no JS measuring; `transition-[grid-template-columns,opacity] duration-300
  ease-out`, `motion-reduce:transition-none`). Icon flips to `EyeOff`.
- **Tap again (EyeOff)**: collapses back to the pulsing eye.
- Accessibility: the toggle carries `aria-expanded` + translated `aria-label`
  (`mushaf.expandViewing` / `mushaf.collapseViewing`); the Exit link is
  `tabIndex={-1}` while collapsed so it's not focusable when hidden.
- Position unchanged (top, clear of the 56px nav), RTL-aware, `pointer-events`
  only on the control. Motion follows the project rule (no `tailwindcss-animate`;
  core `animate-pulse` + `transition-*` only, all `motion-reduce`-guarded).

New i18n keys: `mushaf.expandViewing`, `mushaf.collapseViewing` (ar + en).

## Addendum 3 — Move the viewing indicator into the safha header (2026-07-05)

Feedback: the floating chip shouldn't be `fixed`/overlay — it overlapped the surah
name on mobile and needed manual bottom spacing on large screens. Resolution: render
the indicator **inline in the safha header** instead of as an overlay. This reuses
existing header chrome, so it consumes **no** extra viewport-fit budget (no risk of
clipping the last line — the reader's mobile height math is exact, ADR 0011) and it
physically cannot overlap the centred surah glyph (the header is a 3-column grid).

- **Moved** `app/[locale]/mushaf/[grant]/ViewingChip.tsx` →
  `app/components/reader/ViewingChip.tsx` (it's now a reader component, imported by
  the shared `QuranSafha`). Restyled from a fixed overlay to a compact **in-flow**
  `inline-flex`: `size-6` pulsing eye, `text-[10px]` to match header text. Collapse/
  expand + breathing pulse (`motion-reduce`-guarded) retained. Expanded shows the
  bold owner name + Exit (dropped the redundant "Viewing" word — the eye conveys it);
  label capped `max-w-[45vw]` on mobile with `truncate` so it never spills into the
  surah glyph, Exit stays `flex-none` so it's always tappable.
- `QuranSafha` gains `viewingOwnerName?: string | null`; when set it renders
  `<ViewingChip>` in the header **start cell** beside the juz label. Undefined (self
  reader) → nothing rendered; header is cosmetically identical.
- `ReaderPage` threads `viewingOwnerName` → `QuranSafha`.
- The grant `pages/[id]/page.tsx` resolves the owner name (grant → owner) and passes
  it; the grant `layout.tsx` no longer renders the chip or fetches the owner (only
  the access guard + Sidebar remain).
- `mushaf.viewingChip` key is now unused (kept in messages, harmless).

## Addendum 4 — Simplify to an icon-only indicator (2026-07-05)

Feedback: the expandable in-header chip **broke the safha design** (the taller
`size-6` control + expanding label disturbed the header's alignment). Resolution:
strip the interactivity entirely — the indicator is now a single **static, non-
expandable pulsing eye**.

- `ViewingChip` reduced to a `size-4` (smaller than the centred surah glyph, so it
  adds **no** header height) pulsing eye — no `useState`, no expand/collapse, no
  label, no Exit link. It's a plain `role="img"` span; the owner name is surfaced
  only via `title`/`aria-label`. Exit stays available through the navbar
  `SharedMushafLink` / sidebar, so no in-safha exit control is needed.
- `mushaf.viewingChip` repurposed to `"Viewing {name}'s mushaf"` (ar:
  `"تتصفح مصحف {name}"`) for the tooltip; the now-unused `exitViewing`,
  `expandViewing`, `collapseViewing` keys were removed.
- `QuranSafha` / `ReaderPage` / grant `page.tsx` wiring unchanged (still threads
  `viewingOwnerName`).

## Addendum 5 — Review fixes from /review-fq-work (2026-07-05)

Ten findings from the branch review. Grouped by area; each is a small, self-contained
change. Two carry decisions the user approved: **#4** harden the auth header
(not verify-only), **#6** extract a shared marks helper (not leave-as-is).

### Security / correctness

**1. Stop exposing the counterparty's email in the hub (warning).**
`app/api/mushaf/grants/route.ts` selects `email` and returns it; both
`AccessibleMushafList.tsx` and `GrantedViewersList.tsx` render it as a secondary
line. ADR 0012 lists "no name/email exposure" as an explicit benefit — email is the
deviation (name is fine: it's a deliberate grant). Fix:
- `grants/route.ts`: drop `email` from the `user.findMany` `select` (keep `id`, `name`).
- `accessGrants.ts`: remove `email` from the `GrantUser` type.
- `AccessibleMushafList.tsx` + `GrantedViewersList.tsx`: delete the
  `{grant.user?.email ? …}` block. Name stays as the primary line (already there),
  `PersonAvatar` unchanged. Unknown-name still falls back to `mushaf.unknownUser`.

**2. Make redeem transactional (note).**
`app/api/mushaf/codes/redeem/route.ts` spends the code (`updateMany`) then upserts
the grant in two separate awaits — if the upsert throws, the one-time code is
consumed with no grant, permanently stranding the user. Wrap both in an interactive
`appPrisma.$transaction(async (tx) => { … })`: do the conditional `updateMany` inside,
return `null` if `spent.count === 0`, else return the `upsert`. Handle the `null`
(→ 404 "invalid or already used") outside the transaction. The self-redeem and
missing-code guards stay before the transaction.

**3. Don't hide the viewing eye when the owner's name is empty (note).**
`app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` passes
`viewingOwnerName={owner?.name ?? ""}`, and `QuranSafha.tsx:164` gates the eye on
`viewingOwnerName ?` (truthiness) — so a null/empty owner name silently drops the one
cue that you're editing someone else's mushaf. The reader already knows it's a grant
view via `grantId`. Fix:
- `QuranSafha.tsx`: gate `<ViewingChip>` on `grantId` (present ⇒ grant view), not on
  `viewingOwnerName`. Pass `ownerName={viewingOwnerName}` (may be null/empty).
- `ViewingChip.tsx`: `ownerName?: string | null`; when name is falsy, use a generic
  label (new key `mushaf.viewingChipGeneric`, e.g. en "Viewing another user's mushaf",
  ar "تتصفح مصحف مستخدم آخر") for `title`/`aria-label` instead of interpolating.
- `page.tsx`: pass `owner?.name ?? null` (drop the `?? ""` coercion).
- `messages/{ar,en}.json`: add `mushaf.viewingChipGeneric`.

**4. Harden the `user` auth header (note, pre-existing — user chose harden+verify).**
`auth-middleware.ts` sets the trusted token via `response.headers.set("user", …)` on
`NextResponse.next()`, but handlers read it from the **request** via
`extractUser(req.headers.get("user"))`. In Next 14 those are different header bags, so
(a) a client could send its own `user` request header and (b) the decoded token leaks
to the browser as a response header. `withIntl` short-circuits for non-`/api` paths and
does **not** mutate the response for `/api` paths, so `withAuth` can safely return a
fresh forwarding response without dropping intl work. Fix in `withAuth`:
```ts
const requestHeaders = new Headers(req.headers);
requestHeaders.delete("user");                      // drop any client-forged value
requestHeaders.set("user", JSON.stringify(token));  // inject the trusted token
return middleware(req, event,
  NextResponse.next({ request: { headers: requestHeaders } }));
```
- Update DECISIONS.md **"Auth"** section (lines ~110–121): it currently documents "set
  the header on the API **response**" — rewrite to "middleware strips any incoming
  `user` header and forwards the trusted token via request headers
  (`NextResponse.next({ request })`)". Keep the `getServerSession`-in-layouts note.
- Add a consequence line to **ADR 0012** noting the header-strip + request-forwarding
  invariant (client-supplied identity is never trusted; token isn't echoed to the client).
- **Verify** (per the user's choice): after the change, `curl` the self-marks GET with a
  forged `user: {"id":999}` header and confirm it is NOT trusted (401/own data, not 999's),
  and confirm a real logged-in session still saves both self marks and grant marks.

### Code quality

**5. Rename the duplicate `generateShareCode` (note).**
Two exported functions share the name: the crypto generator in
`app/utils/share-code.ts` and the client fetch-wrapper in
`app/server/actions/mushaf/accessGrants.ts`. Rename the **action** to
`requestShareCode` (leave the crypto util as-is — it's the primitive). Update its one
importer, `app/components/mushaf/GenerateCodeCard.tsx`.

**6. Extract a shared marks helper (note — user chose extract).**
`app/api/mushaf/[grantId]/pages/[pageId]/marks/route.ts` POST/DELETE bodies are
near-verbatim copies of `app/api/quran/pages/[pageId]/marks/route.ts`. Add to
`app/api/mushaf/access.ts`:
- `upsertMark({ toUser, fromUser, page, body })` — the field validation + `mark.upsert`
  (returns a discriminated result or throws a 422-style sentinel; keep it simple —
  return `{ ok: false }` on missing fields so each route emits its own `jsonResponse`).
- `deleteMark({ toUser, body })` — the `deleteMany` by compound key.
Both routes call these; the grant route keeps its `getGrantForViewer` pre-check, the
self route keeps `to_user = from_user = self`. Preserve existing response messages
verbatim (incl. the "succesfully" spelling) so behavior is unchanged. Leave the GET
bodies alone (they already share `withAuthorNames`).

**7. Short-circuit `withAuthorNames` for self-only pages (note, efficiency).**
`app/api/mushaf/access.ts:withAuthorNames` runs a second `user.findMany` on every
self-marks GET (hot path, every page turn). Query only *foreign* author ids:
```ts
const foreignIds = Array.from(
  new Set(marks.map((m) => m.from_user).filter((id) => id !== viewerId)),
);
```
When empty (the common self-only case) skip the query entirely. Own marks get
`author_name: null` — safe: the only consumer,
`QuranSafha.tsx:123` (`markedByName={meta && !meta.isOwn ? meta.authorName : null}`),
reads `authorName` only when `!isOwn`.

**8. Consistent page-id parsing in the grant marks route (note).**
Same file uses `parseInt(context.params.pageId)` in GET but `Number(context.params.pageId)`
in POST. Standardize on `Number(...)` in both (matches the self route's create path).

### Docs

**9. Fix the ViewingChip animation comment (note).**
`ViewingChip.tsx` doc-comment says the eye "flickers (two quick dips per ~2.4s cycle)",
but the shipped `flicker` keyframe (`tailwind.config.ts`) is a **single** dip at 94%
over **3s**. Update the comment to match ("a single quick dip per 3s cycle"). Also
reconcile the Addendum 2/4 wording above (which mention `animate-pulse`) — the shipped
animation is the bespoke `flicker` keyframe, not core `animate-pulse`.

**10. Fix stale paths in this plan's "Files to Change" (note).**
Done above: `use-access.ts` → `use-access-grants.ts`, and
`[grant]/ViewingChip.tsx` → `components/reader/ViewingChip.tsx`.

### Files to change (Addendum 5)

- `app/api/mushaf/grants/route.ts` — drop `email` from select (#1).
- `app/server/actions/mushaf/accessGrants.ts` — remove `email` from `GrantUser`; rename
  `generateShareCode` → `requestShareCode` (#1, #5).
- `app/components/mushaf/AccessibleMushafList.tsx`, `GrantedViewersList.tsx` — remove
  email line (#1).
- `app/components/mushaf/GenerateCodeCard.tsx` — use `requestShareCode` (#5).
- `app/api/mushaf/codes/redeem/route.ts` — wrap spend+upsert in `$transaction` (#2).
- `app/[locale]/mushaf/[grant]/pages/[id]/page.tsx` — `owner?.name ?? null` (#3).
- `app/components/QuranSafha.tsx` — gate `ViewingChip` on `grantId` (#3).
- `app/components/reader/ViewingChip.tsx` — nullable `ownerName` + generic label; fix
  doc-comment (#3, #9).
- `app/middlewares/auth-middleware.ts` — strip + request-header forwarding (#4).
- `app/api/mushaf/access.ts` — add `upsertMark`/`deleteMark`; short-circuit
  `withAuthorNames` (#6, #7).
- `app/api/mushaf/[grantId]/pages/[pageId]/marks/route.ts` — use helpers; `Number()` in
  GET (#6, #8).
- `app/api/quran/pages/[pageId]/marks/route.ts` — use the shared helpers (#6).
- `messages/ar.json`, `messages/en.json` — `mushaf.viewingChipGeneric` (#3).
- `docs/architecture/DECISIONS.md` — rewrite "Auth" mechanism (#4).
- `docs/architecture/adr/0012-shared-mushaf-access.md` — add header-hardening
  consequence (#4).

Set **Status** back to `implemented` once these land and verification (#4) passes.

## Addendum 6 — Logout on a grant page 404s (+ colorless home follow-on) (2026-07-05)

**Type:** bug. Reported: while viewing someone else's mushaf at
`/{locale}/mushaf/{grant}/pages/{n}`, logging out shows the **404 page**; clicking
"back to home" from there lands on `/{locale}` **without theme colors**.

### Root cause

`app/[locale]/mushaf/[grant]/layout.tsx` guards access with `getServerSession`; when
there's no session it calls `notFound()`. On logout, `signOut()` full-reloads the
current (grant) URL, the layout finds no session, and `notFound()` renders the **root**
`app/not-found.tsx` (it lives above `[locale]`, so it renders under the root layout, not
the locale layout). That is the 404.

The colorless home is a **side effect of that root 404**, not a separate theme bug. The
theme is a `theme-*` class on `<html>` applied by (a) the inline `<head>` script in
`app/layout.tsx` on full loads and (b) `useTheme()` inside `ThemeToggle`, which only
mounts when the settings panel is open. Landing on the bare root 404 during the signOut
reload and then soft-navigating home leaves `<html>` without the class in that specific
sequence, so `--primary`/`--background` are undefined → monochrome page.

**Verified:** reproduced the root 404 in isolation (navigated to a bogus
`/ar/…` URL) and confirmed the plain *404 → click home* path **keeps** the theme
(`<html class="theme-light"`, `--primary` set, page fully colored). So the colorless
render is coupled to the `signOut()` reload → `notFound()` path specifically, and
removing that 404 removes the symptom — no theme-system change needed.

### Fix

`app/[locale]/mushaf/[grant]/layout.tsx` — distinguish *unauthenticated* from
*wrong-viewer*:
```ts
import { redirect } from "next/navigation";
// …
const session = await getServerSession(authOptions);
const viewerId = (session?.user as { id?: number } | undefined)?.id;

if (!viewerId) {
  redirect(`/${locale}`);          // logged out / not signed in → locale home (user choice)
}

const grantRecord = await appPrisma.mushafAccessGrant.findUnique({ where: { id: grant } });
if (!grantRecord || grantRecord.viewer_user !== viewerId) {
  notFound();                      // signed in but not this grant's viewer / missing → genuine 404
}
```
`notFound()` stays for the genuine not-found/forbidden case (a real, correctly-themed
404 reached deliberately, which the isolation test showed renders fine). The
unauthenticated case — the only one that happens on logout — now redirects to the locale
home (full load ⇒ inline script ⇒ theme applied ⇒ colors intact).

### Files to change (Addendum 6)

- `app/[locale]/mushaf/[grant]/layout.tsx` — `redirect(`/${locale}`)` when no `viewerId`;
  keep `notFound()` for wrong-viewer / missing grant.

### Not doing

- No change to the theme system / `useTheme` / inline script — the isolation test shows
  the generic 404→home path already preserves colors; the redirect removes the only path
  that didn't.

## What NOT to do

- Do not add a user-search / directory endpoint (privacy; out of scope).
- Do not add an approval/notification inbox — the code is the consent.
- Do not change the `Mark` unique key or add per-author mark stacking.
- Do not add relations between the new tables and `User`/`Mark`.
- Do not make `/[locale]/pages/[id]` dynamic or owner-aware.
- Do not trust the grant id from the URL without the server-side viewer check.
