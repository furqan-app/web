# Fix Reader Hydration Mismatch (ReaderPage style injection)

**Type:** bug  
**Date:** 2026-07-10  
**Status:** implemented  
**Trello:** #79 https://trello.com/c/L6UWbBKe

## Root Cause

`ReaderPage` (Server Component) returns a `<style dangerouslySetInnerHTML>`. Next.js App Router treats `<style>` in RSC output as a hoistable resource and moves it to a different DOM position during client-side reconciliation (locale layout level, alongside `<Nav>`) than its SSR position (ReaderPage level, before `<QuranSwipeNav>`). React's tree-walker sees divergent structure and cascades 12+ hydration errors; `QuranSwipeNav`'s outer `div.w-full.overflow-hidden` ends up absent from the DOM after re-render.

`<link rel="preload">` is not affected — Next.js hoists it consistently in both paths; it stays in `ReaderPage`.

## Fix

Extract the `<style dangerouslySetInnerHTML>` into a `"use client"` component. Client Components render at the same DOM position in SSR and client — no reconciler mismatch.

**`app/components/reader/FontFaceInjector.tsx`** (new):

```tsx
"use client";

type Props = { pageIds: number[] };

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

**`app/components/reader/ReaderPage.tsx`**: replace `<style dangerouslySetInnerHTML>` with `<FontFaceInjector pageIds={[rightPageId, leftPageId]} />`.

## Files Changed

- `app/components/reader/FontFaceInjector.tsx` — new `"use client"` component
- `app/components/reader/ReaderPage.tsx` — replace inline style with `<FontFaceInjector>`

## Constraints

- `<link rel="preload">` stays in `ReaderPage` — it is not the mismatch source.
- `FontFaceInjector` must be a leaf Client Component with no server children.
- Never put `<style dangerouslySetInnerHTML>` back in a Server Component — the breakage is silent at build/lint time, only manifests in browser. See [ADR 0020](../architecture/adr/0020-client-component-for-inline-style-injection.md).
- Do not use `suppressHydrationWarning` — silences errors without fixing the structural DOM mismatch.
- Do not remove the `<style>` and rely on a global stylesheet — per-page font injection is intentional (loading all 604 fonts globally is prohibitively large).
- `FontFaceInjector` SSRs its initial render — no flash of unstyled text, no loading state needed.
