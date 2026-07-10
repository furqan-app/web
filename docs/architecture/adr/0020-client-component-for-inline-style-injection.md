# ADR 0020: Client Component Required for Inline `<style>` Injection

**Date:** 2026-07-10  
**Status:** Accepted

## Context

`ReaderPage` is a Server Component that renders per-page `@font-face` rules via `<style dangerouslySetInnerHTML>`. During investigation of cascading hydration errors (12+ mismatch exceptions, full root fallback to client rendering), it was discovered that Next.js App Router treats `<style>` tags inside RSC output as "RSC resources" and hoists them to a different position in the rendered document on the client side during reconciliation than the position they occupy in the SSR HTML.

Concretely: the SSR HTML has `<style>` inline at the ReaderPage level (inside `<body>`, after the Sidebar Suspense markers, before `QuranSwipeNav`). The client RSC reconciler moves/handles it at the locale layout level (alongside `<Nav>`). React's DOM walker sees the resulting structural mismatch — `QuranSwipeNav`'s outer `div.w-full.overflow-hidden` ends up absent from the reconciled DOM — and throws 12+ cascading hydration errors before falling back to full client re-render.

Client Components (`"use client"`) do not exhibit this behavior: they render at the same DOM position in both SSR and client, so React's reconciler never sees a mismatch.

## Decision

Any `<style dangerouslySetInnerHTML>` injection on Quran reader pages must live in a `"use client"` component, never in a Server Component.

The implementation is `app/components/reader/FontFaceInjector.tsx`, a minimal Client Component that accepts `pageIds: number[]` and renders the `@font-face` rules via `dangerouslySetInnerHTML`.

## Constraints

- `<link rel="preload">` is NOT affected — it is correctly hoisted to `<head>` by Next.js in both SSR and client paths, so it may remain in the Server Component (`ReaderPage`).
- Do not move `<style dangerouslySetInnerHTML>` back to a Server Component. The hydration breakage is silent until a real browser loads the page; it will not surface in build or lint.
- `FontFaceInjector` must remain a leaf Client Component (no server children) to avoid the "Server Component inside Client Component" constraint.

## Consequences

- `FontFaceInjector` sends a tiny extra JS bundle (the component itself, ~10 lines). This is negligible versus the correctness fix.
- The font rules are still injected before any Quran text is rendered (Client Components still SSR their initial render), so there is no flash of unstyled text.
