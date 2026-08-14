"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server — React warns that
 * layout effects do nothing during SSR, and every consumer here is a client
 * component that is still server-rendered.
 *
 * Reach for this (over plain `useEffect`) whenever the effect must run BEFORE
 * the browser paints: `useEffect` runs after paint by definition, so anything
 * it corrects is visible first. That is the defect behind both flashes ADR 0042
 * fixes, and the false→true breakpoint shift the media-query hooks avoid.
 *
 * This is the only definition — use-is-desktop-up, use-is-tablet, use-is-mobile,
 * Nav and ReaderPager all import it. Do not re-inline the ternary.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
