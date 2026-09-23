import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeCurrentWeekScrollLeft,
  getRtlScrollType,
  resetCachedRtlScrollType,
  scrollToCurrentWeek,
} from "./heatmap-scroll";

describe("heatmap-scroll", () => {
  describe("getRtlScrollType", () => {
    const originalDocument = globalThis.document;

    afterEach(() => {
      resetCachedRtlScrollType();
      vi.restoreAllMocks();
      if (originalDocument !== undefined) {
        globalThis.document = originalDocument;
      } else {
        // @ts-expect-error cleanup
        delete globalThis.document;
      }
    });

    it("returns 'negative' in SSR / Node environment when document is undefined", () => {
      // @ts-expect-error simulating SSR
      delete globalThis.document;
      resetCachedRtlScrollType();
      expect(getRtlScrollType()).toBe("negative");
    });

    it("detects 'positive-descending' when initial scrollLeft > 0 and cleans up DOM", () => {
      resetCachedRtlScrollType();
      let scrollLeftValue = 4;
      const removedChildren: unknown[] = [];
      const appendedChildren: unknown[] = [];

      const mockDefiner = {
        style: {},
        dir: "",
        get scrollLeft() {
          return scrollLeftValue;
        },
        set scrollLeft(val: number) {
          scrollLeftValue = val;
        },
        appendChild: vi.fn(),
      };

      const mockDoc = {
        createElement: vi.fn(() => mockDefiner),
        body: {
          appendChild: vi.fn((child) => appendedChildren.push(child)),
          removeChild: vi.fn((child) => removedChildren.push(child)),
        },
      };

      // @ts-expect-error test mock
      globalThis.document = mockDoc;

      const result = getRtlScrollType();
      expect(result).toBe("positive-descending");
      expect(mockDoc.body.appendChild).toHaveBeenCalledWith(mockDefiner);
      expect(mockDoc.body.removeChild).toHaveBeenCalledWith(mockDefiner);
      expect(removedChildren).toContain(mockDefiner);
    });

    it("detects 'negative' when scrollLeft remains 0 after setting to 1", () => {
      resetCachedRtlScrollType();
      let scrollLeftValue = 0;

      const mockDefiner = {
        style: {},
        dir: "",
        get scrollLeft() {
          return scrollLeftValue;
        },
        set scrollLeft(_val: number) {
          scrollLeftValue = 0;
        },
        appendChild: vi.fn(),
      };

      const mockDoc = {
        createElement: vi.fn(() => mockDefiner),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      // @ts-expect-error test mock
      globalThis.document = mockDoc;

      const result = getRtlScrollType();
      expect(result).toBe("negative");
      expect(mockDoc.body.removeChild).toHaveBeenCalledWith(mockDefiner);
    });

    it("detects 'positive-ascending' when scrollLeft accepts positive value 1", () => {
      resetCachedRtlScrollType();
      let scrollLeftValue = 0;

      const mockDefiner = {
        style: {},
        dir: "",
        get scrollLeft() {
          return scrollLeftValue;
        },
        set scrollLeft(val: number) {
          scrollLeftValue = val;
        },
        appendChild: vi.fn(),
      };

      const mockDoc = {
        createElement: vi.fn(() => mockDefiner),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      // @ts-expect-error test mock
      globalThis.document = mockDoc;

      const result = getRtlScrollType();
      expect(result).toBe("positive-ascending");
      expect(mockDoc.body.removeChild).toHaveBeenCalledWith(mockDefiner);
    });

    it("caches the detected type on subsequent calls until resetCachedRtlScrollType is invoked", () => {
      resetCachedRtlScrollType();
      let createElementCalls = 0;

      const mockDefiner = {
        style: {},
        dir: "",
        scrollLeft: 4,
        appendChild: vi.fn(),
      };

      const mockDoc = {
        createElement: vi.fn(() => {
          createElementCalls++;
          return mockDefiner;
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      // @ts-expect-error test mock
      globalThis.document = mockDoc;

      expect(getRtlScrollType()).toBe("positive-descending");
      expect(createElementCalls).toBe(2); // definer + content

      // Second call uses cache, does not probe DOM again
      expect(getRtlScrollType()).toBe("positive-descending");
      expect(createElementCalls).toBe(2);

      // After reset, probes DOM again
      resetCachedRtlScrollType();
      expect(getRtlScrollType()).toBe("positive-descending");
      expect(createElementCalls).toBe(4);
    });
  });

  describe("computeCurrentWeekScrollLeft", () => {
    it("computes rightmost scroll offset in LTR with overflow", () => {
      // Measured English dashboard: scrollWidth: 796, clientWidth: 598
      const target = computeCurrentWeekScrollLeft({
        scrollWidth: 796,
        clientWidth: 598,
        isRtl: false,
      });
      expect(target).toBe(198);
    });

    it("returns 0 in LTR when content fits within clientWidth", () => {
      const target = computeCurrentWeekScrollLeft({
        scrollWidth: 500,
        clientWidth: 600,
        isRtl: false,
      });
      expect(target).toBe(0);
    });

    it("returns 0 in RTL on negative-scroll engines (Chromium, Firefox, modern WebKit)", () => {
      const target = computeCurrentWeekScrollLeft({
        scrollWidth: 796,
        clientWidth: 598,
        isRtl: true,
        rtlScrollType: "negative",
      });
      expect(target).toBe(0);
    });

    it("returns scrollWidth - clientWidth in RTL on positive-descending engines (legacy WebKit)", () => {
      const target = computeCurrentWeekScrollLeft({
        scrollWidth: 796,
        clientWidth: 598,
        isRtl: true,
        rtlScrollType: "positive-descending",
      });
      expect(target).toBe(198);
    });

    it("returns 0 in RTL on positive-ascending engines (legacy IE/Trident)", () => {
      const target = computeCurrentWeekScrollLeft({
        scrollWidth: 796,
        clientWidth: 598,
        isRtl: true,
        rtlScrollType: "positive-ascending",
      });
      expect(target).toBe(0);
    });

    it("returns 0 in RTL when content does not overflow", () => {
      const target = computeCurrentWeekScrollLeft({
        scrollWidth: 400,
        clientWidth: 500,
        isRtl: true,
        rtlScrollType: "positive-descending",
      });
      expect(target).toBe(0);
    });
  });

  describe("scrollToCurrentWeek", () => {
    it("assigns scrollLeft directly to target offset without animation", () => {
      const mockElement = {
        scrollWidth: 796,
        clientWidth: 598,
        scrollLeft: 0,
      } as HTMLElement;

      scrollToCurrentWeek(mockElement, false);
      expect(mockElement.scrollLeft).toBe(198);
    });
  });
});
