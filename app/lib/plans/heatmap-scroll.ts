/**
 * Engine-independent scroll alignment for the 52-week activity heatmap.
 *
 * In both LTR and RTL layouts, the current week sits at the rightmost edge of the
 * lattice (in LTR as inline-end, in RTL as inline-start due to column reversal).
 *
 * Browser engines handle RTL `scrollLeft` differently:
 * - "negative" (standard CSSOM View: Chromium, Firefox, WebKit/Safari 15.4+):
 *   0 is inline-start (right), -(scrollWidth - clientWidth) is inline-end (left).
 * - "positive-descending" (legacy WebKit / older Safari):
 *   scrollWidth - clientWidth is inline-start (right), 0 is inline-end (left).
 * - "positive-ascending" (legacy IE/Trident):
 *   0 is inline-start (right), scrollWidth - clientWidth is inline-end (left).
 */

export type RtlScrollType = "negative" | "positive-descending" | "positive-ascending";

let cachedRtlScrollType: RtlScrollType | null = null;

export function getRtlScrollType(): RtlScrollType {
  if (cachedRtlScrollType) return cachedRtlScrollType;
  if (typeof document === "undefined") return "negative";

  const definer = document.createElement("div");
  definer.dir = "rtl";
  definer.style.width = "4px";
  definer.style.height = "1px";
  definer.style.position = "absolute";
  definer.style.top = "-9999px";
  definer.style.overflow = "scroll";

  const content = document.createElement("div");
  content.style.width = "8px";
  content.style.height = "1px";
  definer.appendChild(content);

  document.body.appendChild(definer);
  if (definer.scrollLeft > 0) {
    cachedRtlScrollType = "positive-descending";
  } else {
    definer.scrollLeft = 1;
    if (definer.scrollLeft === 0) {
      cachedRtlScrollType = "negative";
    } else {
      cachedRtlScrollType = "positive-ascending";
    }
  }
  document.body.removeChild(definer);
  return cachedRtlScrollType;
}

export function resetCachedRtlScrollType(): void {
  cachedRtlScrollType = null;
}

export interface ComputeScrollOptions {
  scrollWidth: number;
  clientWidth: number;
  isRtl: boolean;
  rtlScrollType?: RtlScrollType;
}

export function computeCurrentWeekScrollLeft({
  scrollWidth,
  clientWidth,
  isRtl,
  rtlScrollType = getRtlScrollType(),
}: ComputeScrollOptions): number {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  if (maxScroll === 0) return 0;

  if (!isRtl) {
    // In LTR, current week is on the far right (inline-end).
    return maxScroll;
  }

  // In RTL, current week is on the far right (inline-start).
  if (rtlScrollType === "positive-descending") {
    return maxScroll;
  }
  return 0;
}

export function scrollToCurrentWeek(
  element: HTMLElement,
  isRtl: boolean,
  rtlScrollType?: RtlScrollType
): void {
  const target = computeCurrentWeekScrollLeft({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    isRtl,
    rtlScrollType,
  });

  // Assign scrollLeft directly to ensure non-animating instant jump across all engines,
  // respecting prefers-reduced-motion and preventing visual flash.
  element.scrollLeft = target;
}
