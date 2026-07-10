# Fix Reader Hydration Mismatch (ReaderPage style injection)

**Type:** bug  
**Date:** 2026-07-10  
**Status:** implemented  
**Trello:** #79 "The page render multiple times" — https://trello.com/c/L6UWbBKe

## Summary

`/ar/pages/[id]` (and `/en/pages/[id]`) produce 12+ cascading React hydration errors ending with "entire root will switch to client rendering". The root cause is a `<style dangerouslySetInnerHTML>` in `ReaderPage`, which is a Server Component. Next.js App Router treats `<style>` tags in RSC output as hoistable resources and moves them to a different DOM position during client-side reconciliation than their position in the SSR HTML. This structural divergence throws React's DOM walker off: `QuranSwipeNav`'s outer `div.w-full.overflow-hidden` ends up absent from the reconciled DOM after re-render.

Fix: extract the `<style dangerouslySetInnerHTML>` into a new `"use client"` component `FontFaceInjector`. Client Components render at the same DOM position in both SSR and client paths, so React's reconciler never sees a mismatch.

## Root Cause

In `app/components/reader/ReaderPage.tsx` (Server Component), the JSX fragment returns:

```tsx
<>
  <style dangerouslySetInnerHTML={{ __html: fontFaceCSS }} />   {/* ← root cause */}
  <link rel="preload" href={`/fonts/v1/ttf/p${pageId}.ttf`} ... />
  <QuranSwipeNav ...>
    ...
  </QuranSwipeNav>
</>
```

Next.js App Router's RSC pipeline treats `<style>` in Server Component output as an RSC resource. During client-side RSC reconciliation it moves the style to a different position (locale layout level, alongside `<Nav>`) than its SSR position (ReaderPage level, before `QuranSwipeNav`). React's tree-walker then sees:

- Server HTML: `[Sidebar markers] → <style> → <QuranSwipeNav outer div>`
- Client vDOM: `[Nav] → <style> → <QuranSwipeNav outer div>` (style already consumed at parent level)

The mismatch cascades: React cannot reconcile `QuranSwipeNav`'s outer `div.w-full.overflow-hidden` into the right DOM position, and it is absent from the DOM after client re-render. The first reported error anchors on `QuranSafhaViewToggle`'s `<button>` (the next expected node after the missing outer div).

`<link rel="preload">` is NOT affected — Next.js always hoists it to `<head>` consistently in both SSR and client. It may stay in `ReaderPage`.

## Fix

1. Create `app/components/reader/FontFaceInjector.tsx` as a `"use client"` component:

```tsx
"use client";

type Props = {
  pageIds: number[];
};

export function FontFaceInjector({ pageIds }: Props) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: pageIds
          .map(
            (id) => `
@font-face {
  font-family: 'quran-p${id}';
  src: url('/fonts/v1/ttf/p${id}.ttf') format('truetype');
  font-display: block;
}`
          )
          .join("\n"),
      }}
    />
  );
}
```

2. In `app/components/reader/ReaderPage.tsx`, replace the inline `<style dangerouslySetInnerHTML>` with `<FontFaceInjector pageIds={[rightPageId, leftPageId]} />`.

## Files to Change

- `app/components/reader/FontFaceInjector.tsx` — create new `"use client"` component
- `app/components/reader/ReaderPage.tsx` — replace `<style dangerouslySetInnerHTML>` with `<FontFaceInjector>`, add import

## Verified Test Cases

| Scenario | Expected result after fix |
|---|---|
| `/ar/pages/203` fresh load | Zero hydration errors in console; `QuranSwipeNav` outer `div.w-full.overflow-hidden` present in DOM |
| `/en/pages/1` fresh load | Same — no hydration errors |
| Client navigation (swipe/arrow) between pages | No re-render flash; `FontFaceInjector` updates `pageIds` prop, new `@font-face` rules injected |
| Odd page (rightPageId = leftPageId - 1) | Both font IDs passed; neither causes duplicate errors |

## Constraints

- `<link rel="preload">` stays in `ReaderPage` — it is NOT the source of the mismatch and is correctly hoisted to `<head>` by Next.js in both paths.
- `FontFaceInjector` must remain a leaf Client Component with no server children.
- Do not move the `<style>` back to a Server Component under any circumstances. The breakage is silent at build/lint time and only manifests in a live browser. See [ADR 0020](../architecture/adr/0020-client-component-for-inline-style-injection.md).

## What NOT to Do

- Do not keep `<style dangerouslySetInnerHTML>` in a Server Component — that is the root cause.
- Do not move `<link rel="preload">` into `FontFaceInjector` — it already works correctly in `ReaderPage` and goes to `<head>` properly.
- Do not add `suppressHydrationWarning` as a workaround — it silences the errors without fixing the structural DOM mismatch; `QuranSwipeNav` would still be missing after re-render.
- Do not remove the `<style>` entirely and rely on a global stylesheet — per-page font injection is intentional (loading all 604 fonts globally is prohibitively large, see DECISIONS.md Font System).

## Decisions Made

- ADR 0020 created: `<style dangerouslySetInnerHTML>` injection must live in a Client Component.
- `<link rel="preload">` stays in `ReaderPage` (Server Component) — already working correctly.
- No visible fallback or loading state needed for `FontFaceInjector` — the component SSRs its initial render so there is no flash of unstyled text.
