"use client";

import { useEffect, useRef, useState } from "react";
import { useQuranMushaf } from "@/app/contexts/QuranMushafContext";
import { ensurePageFonts } from "@/app/utils/page-font-registry";
import { MushafEdition } from "@/app/utils/mushaf-editions";
import { useIsomorphicLayoutEffect } from "@/app/hooks/use-isomorphic-layout-effect";

type Props = {
  pageIds: number[];
  baseFontIds: number[];
};

// How many recently-used page ids to keep mounted/registered. The persistent
// pager (ADR 0028) shifts a small window across pages; if a page's tajweed
// element unmounted (or its registry face evicted) the moment it left the
// window, swiping back would re-download it — a brief not-ready state on every
// revisit. Mirrors the shared registry's own cap (page-font-registry.ts).
const MAX_KEPT = 24;

// Pure LRU step: moves `ids` to the front of `prevKept` (most-recently-used),
// capped at MAX_KEPT. No side effects — safe to call from render.
function nextKept(prevKept: number[], ids: number[]): number[] {
  let kept = prevKept;
  for (const id of ids) {
    kept = kept.filter((x) => x !== id);
    kept.unshift(id);
  }
  return kept.length > MAX_KEPT ? kept.slice(0, MAX_KEPT) : kept;
}

// Tracks a rolling LRU of `ids` across renders and returns it sorted ascending.
// Uses React's "adjust state during render" pattern instead of a mutated ref:
// comparing `ids` against the previously-seen signature and calling `setState`
// synchronously in the render body (not in an effect) when it differs. React
// re-renders immediately with the fresh state before committing, so there is
// no extra render pass and no flash of the stale list — and, unlike a ref
// write, a render that never commits (a Suspense retry, an interrupted
// transition) never leaves the tracked list mutated. Two independent LRUs are
// needed here (tajweed's keyed <style> ids vs. the registry's base-font ids)
// because they can legitimately diverge — see the baseFontIds prop doc below.
function useLruIds(ids: number[]): number[] {
  const idsKey = ids.join(",");
  const [tracked, setTracked] = useState(() => {
    const kept = nextKept([], ids);
    return { key: idsKey, kept, sorted: [...kept].sort((a, b) => a - b) };
  });

  if (tracked.key !== idsKey) {
    const kept = nextKept(tracked.kept, ids);
    const sorted = [...kept].sort((a, b) => a - b);
    setTracked({ key: idsKey, kept, sorted });
    return sorted;
  }

  return tracked.sorted;
}

export function FontFaceInjector({ pageIds, baseFontIds }: Props) {
  const { edition } = useQuranMushaf();

  // Tajweed keyed <style> ids — pure CSS declaration, safe to over-list with
  // the pair-expanded pageIds (browsers never fetch an unrendered @font-face).
  const injectedIds = useLruIds(pageIds);

  // Base-font registry ids (ADR 0029) — ensurePageFonts's face.load() is
  // eager, so this must only include ids the caller has confirmed are actually
  // visible (baseFontIds excludes an invisible spread partner on single-page
  // views; see ADR 0029's Addendum). Tracked as its own LRU, independent of the
  // tajweed one above, since the two lists can diverge.
  const baseInjectedIds = useLruIds(baseFontIds);
  const baseInjectedIdsKey = baseInjectedIds.join(",");

  useEffect(() => {
    // Colour-glyph editions load via the adopted-stylesheet path below instead —
    // registering them here too would download every page font twice.
    if (edition.usesColorGlyphs) return;
    ensurePageFonts(baseInjectedIds, edition);
    // baseInjectedIds is a new array each render; the joined key is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseInjectedIdsKey, edition]);

  // One CSSStyleSheet per page id, adopted via `document.adoptedStyleSheets`
  // instead of a mounted `<style>` DOM element (ADR 0023 Addendum 9). A brand
  // new sheet's own `replaceSync` is safe — it has no prior CSS-connected
  // FontFace to reset, unlike rewriting a sheet already backing loaded faces
  // (ADR 0029). Persisted in a ref (not React state) because it tracks live
  // platform objects (CSSStyleSheet instances adopted by the document), not
  // renderable data.
  //
  // Keyed by page id alone, not id+edition — safe today because only one
  // `usesColorGlyphs` edition exists (QCF V4 Tajweed). If a second colour-glyph
  // edition is ever added, switching between the two would keep adopting a
  // stale sheet for an id already present under the other edition's
  // fontFamily/URL. Re-key by `${edition.id}:${id}` if that ever happens.
  const sheetsRef = useRef<Map<number, CSSStyleSheet>>(new Map());

  // Drops every sheet this instance owns — shared by the edition-switch-away
  // branch below and the unmount-only teardown effect, so the two don't drift.
  const dropOwnedSheets = (sheets: Map<number, CSSStyleSheet>) => {
    if (sheets.size === 0) return;
    const owned = new Set(sheets.values());
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => !owned.has(s));
    sheets.clear();
  };

  // A layout effect, not a plain effect: the replaced `<style key={id}>` JSX
  // registered its @font-face rule synchronously as part of React's own
  // render/commit, available to `document.fonts.check()` as soon as hydration
  // committed. A plain effect fires one tick later, after paint — widening the
  // window where `QuranSafha`'s `fontReady` gate (ADR 0034) sees the font as
  // not-yet-registered. The skeleton/hidden-text contract still covers that
  // window safely either way, but a layout effect keeps the timing as close to
  // the pre-existing behavior as possible rather than deliberately widening it.
  useIsomorphicLayoutEffect(() => {
    const sheets = sheetsRef.current;

    if (!edition.usesColorGlyphs) {
      // Edition switched away from a colour-glyph one — drop every sheet this
      // instance owns rather than leaving stale tajweed @font-face rules adopted.
      dropOwnedSheets(sheets);
      return;
    }

    const keepSet = new Set(injectedIds);

    // New ids only: adopting via `.push()` (not a shared sheet's insertRule, and
    // not array reassignment) is confirmed NOT to reset any other adopted
    // sheet's already-loaded FontFace — measured live via document.fonts status
    // polling during implementation (see docs/plans/tajweed-stylesheet-hover-suppression.md).
    const toAdopt: CSSStyleSheet[] = [];
    for (const id of injectedIds) {
      if (sheets.has(id)) continue;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(buildTajweedRules(id, edition));
      sheets.set(id, sheet);
      toAdopt.push(sheet);
    }
    if (toAdopt.length > 0) {
      document.adoptedStyleSheets.push(...toAdopt);
    }

    // Evicted ids (LRU past MAX_KEPT): removing an adopted sheet DOES still
    // reset every other adopted sheet's FontFace to `unloaded` (measured — the
    // same underlying reset the mounted-`<style>` design was believed, but not
    // actually confirmed, to avoid; see ADR 0023 Addendum 9 / ADR 0029). This
    // is therefore no worse than the pre-existing behavior, not a regression —
    // it just no longer ALSO happens on every plain insertion, which today's
    // `<style>`-per-id mount does unconditionally.
    const evictIds: number[] = [];
    const toEvict: CSSStyleSheet[] = [];
    sheets.forEach((sheet, id) => {
      if (keepSet.has(id)) return;
      evictIds.push(id);
      toEvict.push(sheet);
    });
    evictIds.forEach((id) => sheets.delete(id));
    if (toEvict.length > 0) {
      const evictSet = new Set(toEvict);
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => !evictSet.has(s));
    }
  }, [injectedIds, edition]);

  // Unmount-only teardown — separate from the sync effect above so its cleanup
  // does not run (and incorrectly evict everything) on every ordinary id-list
  // change, only when this FontFaceInjector instance itself unmounts.
  useEffect(() => {
    const sheets = sheetsRef.current;
    return () => dropOwnedSheets(sheets);
  }, []);

  // Never renders DOM — tajweed rules are adopted imperatively above; the
  // non-colour-glyph branch has nothing to render either.
  return null;
}

// Shared tajweed-rule color overrides (indices 3–9). Frame slots 10–12 differ
// per theme to match each card background (Trello #113, ADR 0023 Addendum 13).
const RULE_OVERRIDES = "3 #E70D8A, 4 #BC7F22, 5 #C4A94D, 6 #029E48, 7 #067497, 8 #0FAEC1, 9 #E70D8A";

function buildTajweedRules(id: number, edition: MushafEdition): string {
  return `
@font-face {
  font-family: '${edition.fontFamily(id)}';
  src: url('${edition.fontUrl(id)}') format('woff2');
  font-display: block;
}
@font-palette-values --Light {
  font-family: '${edition.fontFamily(id)}';
  base-palette: 0;
  override-colors: ${RULE_OVERRIDES}, 10 #ffffff, 11 #ffffff, 12 #ffffff;
}
@font-palette-values --Dark {
  font-family: '${edition.fontFamily(id)}';
  base-palette: 1;
  override-colors: 3 #F556B0, 4 #E1AB5B, 5 #D9C78C, 6 #20DF76, 7 #26ACD9, 8 #3FD3E4, 9 #F556B0, 10 #192533, 11 #192533, 12 #192533;
}
@font-palette-values --Gold {
  font-family: '${edition.fontFamily(id)}';
  base-palette: 2;
  override-colors: ${RULE_OVERRIDES}, 10 #faf9f4, 11 #faf9f4, 12 #faf9f4;
}`;
}
