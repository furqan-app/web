"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

type Props = {
  prevHref: string;
  nextHref: string;
  children: React.ReactNode;
};

export function QuranSwipeNav({ prevHref, nextHref, children }: Props) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 50) return;
    // Quran text is always Arabic/RTL regardless of UI locale, so the gesture
    // mapping is constant: swipe right = next page, swipe left = previous.
    // prevHref/nextHref must be plain page-order hrefs (page±1), not the
    // locale-flipped hrefs used by the desktop arrows' getNavigationHref.
    const goNext = deltaX > 0;
    router.push(goNext ? nextHref : prevHref);
  };

  return (
    <div
      className="w-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  );
}
