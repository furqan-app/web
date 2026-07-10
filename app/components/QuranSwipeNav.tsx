"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

// Strong ease-out curve (ui-motion skill recommendation for entering/exiting elements).
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const COMMIT_THRESHOLD = 80; // px
const EXIT_MS = 220;
const SNAP_BACK_MS = 200;

type Props = {
  prevHref: string;
  nextHref: string;
  children: React.ReactNode;
};

export function QuranSwipeNav({ prevHref, nextHref, children }: Props) {
  const router = useRouter();
  const stripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    // Clear any lingering snap-back transition so the next drag starts clean.
    if (stripRef.current) {
      stripRef.current.style.transition = "none";
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Until the gesture is confirmed horizontal, let native scroll handle it.
    if (!isDragging.current && Math.abs(deltaX) <= Math.abs(deltaY)) return;
    isDragging.current = true;

    if (!stripRef.current) return;
    stripRef.current.style.transition = "none";
    stripRef.current.style.transform = `translateX(${deltaX}px)`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (!isDragging.current) return;
    isDragging.current = false;

    const strip = stripRef.current;
    if (!strip) return;

    if (Math.abs(deltaX) < COMMIT_THRESHOLD) {
      strip.style.transition = `transform ${SNAP_BACK_MS}ms ${EASE_OUT}`;
      strip.style.transform = "translateX(0)";
      return;
    }

    // Quran text is always Arabic/RTL regardless of UI locale, so the gesture
    // mapping is constant: swipe right = next page, swipe left = previous.
    const goNext = deltaX > 0;
    const href = goNext ? nextHref : prevHref;
    const commitX = goNext ? "100%" : "-100%";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    strip.style.transition = `transform ${EXIT_MS}ms ${EASE_OUT}`;
    strip.style.transform = `translateX(${commitX})`;
    setTimeout(() => router.push(href), EXIT_MS);
  };

  return (
    // Outer div: touch event boundary, clips the strip during drag.
    <div
      className="w-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div ref={stripRef} className="relative w-full">
        {children}
      </div>
    </div>
  );
}
