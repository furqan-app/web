# Nav: Dedupe NavPillLink classNames into Shared Component

**Type:** bug
**Date:** 2026-08-13
**Status:** implemented

## Summary
`app/components/nav/ContinueReadingLink.tsx` and `app/components/nav/SharedMushafLink.tsx` both hardcode the identical pill-button className string. `app/components/nav/UserMenu.tsx`'s dropdown trigger `<button>` duplicates the same string with one extra modifier (`md:border md:border-border`). The class has already drifted once (UserMenu's copy). Extract a single source of truth so future style changes land in one place.

## Root Cause / Approach
Copy-pasted Tailwind className strings across three nav components, one of which is a `<button>` (not a `Link`), so a single `Link`-wrapping component can't cover all three call sites uniformly.

Approach:
1. Add `app/components/nav/NavPillLink.tsx` — a small `"use client"` component wrapping `Link` (from `@/i18n/routing`) that applies the shared pill className, forwarding `href`, `locale`, `onClick`, and `children`.
2. Export the shared className as a constant, `navPillClassName`, from the same file (or a small shared module) so `UserMenu`'s `<button>` can compose it via `cn(navPillClassName, "md:border md:border-border")` without being forced into the `Link`-based component.
3. Update `ContinueReadingLink` and `SharedMushafLink` to render `<NavPillLink>` instead of `<Link className="...">`.
4. Update `UserMenu`'s trigger `<button>` to use `cn(navPillClassName, "md:border md:border-border")`.

## Decision Tree / Algorithm
Not applicable — no branching logic; this is component extraction. Task meets the "simple" bar (one obvious change, no edge cases, solution fully visible from reading the code), confirmed with the user via a single design question (how UserMenu's button should consume the shared style).

## Verified Test Cases
Not applicable (no algorithm to walk through). Visual regression check: after the change, `ContinueReadingLink`, `SharedMushafLink`, and `UserMenu`'s trigger must render pixel-identical to their current output (UserMenu keeps its extra `md:border md:border-border`).

## Files to Change
- `app/components/nav/NavPillLink.tsx` — new file: exports `navPillClassName` constant and `NavPillLink` component (Link wrapper).
- `app/components/nav/ContinueReadingLink.tsx` — replace `<Link className="...">` with `<NavPillLink href=... locale=... onClick=...>`.
- `app/components/nav/SharedMushafLink.tsx` — replace `<Link className="...">` with `<NavPillLink href="/mushaf" locale=...>`.
- `app/components/nav/UserMenu.tsx` — replace the trigger `<button className="...">`'s literal string with `cn(navPillClassName, "md:border md:border-border")`, importing `navPillClassName` from `./NavPillLink` and `cn` from `@/lib/utils`.

## Constraints
- Preserve existing behavior exactly: `ContinueReadingLink`'s `onClick` jump-to logic, `SharedMushafLink`'s plain link, and `UserMenu`'s `DropdownMenuTrigger asChild` button semantics must be unchanged.
- Do not change icon sizing, icon-only-on-mobile / icon+label-on-desktop behavior, or any other visual aspect — this is a pure dedup, not a redesign.

## What NOT to Do
- Do not force `UserMenu`'s trigger into the `NavPillLink`/`Link`-based component — it's a dropdown trigger button, not a navigation link, and `DropdownMenuTrigger asChild` needs a single interactive child element it controls.
- Do not touch `Sidebar.tsx` or other nav files — their classNames are unrelated (grepped, no overlap with the pill className).
- Do not address the other three nav Trello cards found alongside #202 (#203 Continue Reading visual priority, #204 logo/icon collision) — out of scope for this task.

## Decisions Made
- Shared style is exposed as an exported `navPillClassName` constant (not just baked into `NavPillLink`'s JSX), so `UserMenu`'s `<button>` can compose it with `cn()` alongside its own extra modifier, rather than duplicating the base string or being forced into a `Link`.
