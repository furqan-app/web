# Nav — Decisions

Active decisions for nav chrome & overlays — sidebar loading/trigger, sheet sizing, z-index, live nav state. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Sidebar Loading

**Status:** active

**Decision:** The `Sidebar` component is loaded via `next/dynamic` (deferred JS hydration) in `app/[locale]/pages/layout.tsx`. Sidebar data (surahs, rubs) is fetched server-side in that layout.

**Rationale:** Sidebar is non-critical for initial render of the Quran page; deferring it reduces the JS bundle that blocks hydration.

---

## Sheet `top` Overrides Must Also Neutralize `h-full`

**Status:** active

**Decision:** `SheetContent`'s left/right variant (`components/ui/sheet.tsx`) sets both `inset-y-0` (top:0, bottom:0) and `h-full` (height:100%). Any consumer that overrides `top` inline (e.g. `Sidebar` clearing the nav bar) must neutralize that `h-full` in the same inline style — never leave it to compute height on its own once `top` is overridden. **Set `height: auto` and let `top` + `bottom` size the box** (updated 2026-08-15, #304). This entry previously required an explicit `height: calc(100dvh - …)` instead; that form is now forbidden here, because a viewport unit goes stale across the installed PWA's fullscreen transition and reproduces the very clipping this decision exists to prevent — see [ADR 0044](../adr/0044-viewport-units-are-unreliable-in-the-installed-pwa.md). The rationale below is unchanged and is still what makes `height: auto` mandatory rather than optional: leaving all three of `top`/`height`/`bottom` non-auto is the failure case.

**Rationale:** With `top`, `height`, and `bottom` all non-auto on a `position: fixed` box, the box is CSS-over-constrained; browsers keep `top` + `height` and silently recompute `bottom`. The panel keeps its full 100vh height but starts lower, so its bottom edge extends below the actual viewport by the `top` offset — clipping content near the bottom of the panel (e.g. the last item in a scrollable list) with no way to scroll it into view, since the panel itself is `position: fixed`, not the page. Found via `Sidebar`'s surah/rub list clipping the last item on short viewports (`docs/plans/fix-sidebar-bottom-clip.md`). With `height: auto` there are only two non-auto values, so the box is not over-constrained and its bottom edge lands exactly on the viewport floor without any unit being named at all.

---

## Nav Z-Index Invariant

**Status:** active

**Decision:** The `<nav>` element must carry `relative z-10` in its base `className` (non-overlay mode). `backdrop-blur-md` creates a CSS stacking context with `z-index: auto`, and reader content (specifically `.fq-reader-pager-strip` with `transform: translateX(-100%)`) creates its own `z-index: auto` stacking context later in the DOM — painting over the nav and hiding the search dropdown. `relative` makes z-index apply to the nav; `z-10` ensures the nav's stacking context ranks above reader content (z:auto = 0) without competing with RecitationPlayerBar (z-40) or Radix portals. In overlay mode (`fixed top-0 inset-x-0 z-50`) this is already satisfied and unchanged.

**Constraint:** Do not remove `relative z-10` from the nav's base class. Doing so silently hides the desktop search dropdown on all reader pages.

---

## Sidebar Trigger Architecture

**Status:** active

**Decision:** `Nav` (global, `app/[locale]/layout.tsx`) and `Sidebar` (pages-only, `app/[locale]/pages/layout.tsx`) live at different layout levels and cannot share state via props. `SidebarContext` (`app/contexts/SidebarContext.tsx`), provided in the locale layout, bridges them: `Nav` owns the trigger button and calls `setOpen(true)`; `Sidebar`'s `Sheet` is a controlled component reading `open`/`setOpen` from the same context. The trigger is visible at all breakpoints, gated only by `pathname.includes("/pages/")` (trailing slash required — a bare `"/pages"` substring match false-positives on any route containing that string, e.g. a hypothetical `/pages-list`).

**Rationale:** Replaces an earlier design where `Sidebar` rendered its own always-visible floating-pill `SheetTrigger`.

**Drift note (found 2026-08-13):** commit `e231f77` (`docs/plans/sidebar-surah-indicator.md`) silently reintroduced the floating-pill trigger in `Sidebar.tsx` — carrying that plan's surah-name/chevron content — without updating this decision or restoring the `Nav`-owned trigger. The code and this decision were inconsistent from that commit until `docs/plans/home-page-design-fixes.md` (Addendum — Universal nav menu) restored the `Nav`-owned trigger, now carrying the surah/chevron content rather than the original `PanelLeftOpen` icon.

**Constraints:**
- Do not add a second/duplicate trigger — one trigger, in `Nav`, on pages routes only.
- If relocating or removing this trigger in future work, verify every breakpoint retains equivalent access before assuming "unchanged" — an earlier revision of this pattern silently removed desktop's only way to open the sidebar by adding `md:hidden` to the replacement trigger without noticing the original floating pill had no such guard. See `docs/plans/mobile-nav-ux.md` (Addendum 3) for the incident.
- Any future change to this trigger's location must update this decision in the same commit — do not let code and doc drift apart again (see Drift note above).

---

## Nav-Mounted State Must Be Live, Not One-Shot

**Status:** active

**Decision:** Any client state a `Nav`-mounted component (or other always-mounted, non-remounting layout element) displays and that can change *while the app is already open* must be plain React state kept current by a setter — e.g. a small context updated in lockstep with `localStorage` — never a `localStorage.getItem` read done once in a mount-only `useEffect`.

**Rationale:** `Nav` (`app/[locale]/layout.tsx`) is mounted once per browser session and never remounts during in-app client-side navigation. A component under it that reads `localStorage` once on mount (matching the otherwise-correct hydration pattern used for *initial* preferences like `QuranMushafContext`) silently goes stale the instant something elsewhere in the same session writes a new value — no remount ever happens to trigger a re-read. Confirmed live for `ContinueReadingLink`/`LastReadPageContext` (`docs/plans/save-last-read-page.md`, "What NOT to Do"): scripted browser testing showed the nav link kept pointing at an old page number after in-app navigation had already saved a new one, and clicking the stale link then silently overwrote real progress with the stale page.

**Constraints:**
- The mount-only-`useEffect`-read-from-`localStorage` pattern (as used by `QuranMushafContext`/`QuranSafhaViewContext`/`QuranFontScaleContext`) is still correct for state that's only ever changed by a user action *inside the component that owns it* (a settings toggle, a font-scale slider) — those components re-render on their own write, so staleness never occurs. It is **not** safe for state written by a *different*, independently-mounted component (e.g. a reader-side sync effect writing a value a separate nav link displays).
- When state crosses that boundary — written by one always-mounted piece, displayed by another — route both through a shared context whose setter updates React state and `localStorage` together, so every consumer re-renders live. See `LastReadPageContext` for the reference shape.
