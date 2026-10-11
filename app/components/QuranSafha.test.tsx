/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import { QuranSafha } from "./QuranSafha";
import { getMushafEdition } from "@/app/utils/mushaf-editions";

// Mock dependencies
vi.mock("@hooks/use-translations", () => ({
  default: () => (key: string) => key,
}));

vi.mock("@contexts/DesktopQuranFontSizeContext", () => ({
  useDesktopQuranFontSize: () => ({ desktopQuranFontSize: "medium" }),
}));

vi.mock("@contexts/QuranMushafContext", () => ({
  useQuranMushaf: () => ({
    mushafId: 1,
    edition: getMushafEdition(1),
  }),
}));

vi.mock("@hooks/use-marks", () => ({
  useMarks: () => ({ data: {} }),
}));

vi.mock("@/app/hooks/use-is-tablet", () => ({
  useIsTablet: () => false,
}));

vi.mock("@/app/contexts/NavOverlayContext", () => ({
  useNavOverlay: () => ({ isOverlayActive: false, toggleOverlay: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/bismillah.svg", () => ({
  default: (props: any) => <svg data-testid="bismillah-svg" {...props} />,
}));

vi.mock("@/app/surah-frame.svg", () => ({
  default: (props: any) => <svg data-testid="surah-frame-svg" {...props} />,
}));

describe("QuranSafha mobile orientation and footer", () => {
  const dummyMetadata = {
    chapter_id: 2,
    hizb: "1",
    rub: "1",
    juz: 1,
    manzil: 1,
    page_number: 20,
    ruku: 1,
    sajdah: false,
    words_count: 100,
    chapter: {
      id: 2,
      name_arabic: "البقرة",
      name_simple: "Al-Baqarah",
      revelation_place: "madinah",
      verses_count: 286,
    },
  };

  const origDocument = globalThis.document;

  beforeEach(() => {
    (globalThis as any).document = {
      fonts: {
        check: () => true,
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    };
  });

  afterEach(() => {
    (globalThis as any).document = origDocument;
  });

  it("does not render any green safha ribbon", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <QuranSafha
          page={20}
          lines={{}}
          pageMetadata={dummyMetadata as any}
          locale="ar"
          stackPeekSide="left"
          compensateStackGap
        />
      );
    });

    const root = renderer!.root;
    const ribbonElements = root.findAll((el) => {
      return (el.props?.className ?? "").includes("fq-safha-ribbon");
    });
    expect(ribbonElements).toHaveLength(0);
    renderer?.unmount();
  });

  it("renders mobile open-book indicator aligned to the outer left edge for even (left) pages", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <QuranSafha
          page={20}
          lines={{}}
          pageMetadata={dummyMetadata as any}
          locale="ar"
          stackPeekSide="left"
          compensateStackGap
        />
      );
    });

    const root = renderer!.root;
    const footer = root.find((el) => (el.props?.className ?? "").includes("fq-safha-footer"));
    expect(footer).toBeDefined();
    expect(footer.props.dir).toBe("ltr");
    expect(footer.props.className).toContain("justify-start");
    expect(footer.props.className).toContain("pl-4");

    // Book indicator active numeral span for left page is left-0
    const activeNumeral = root.find((el) =>
      (el.props?.className ?? "").includes("left-0") && (el.props?.className ?? "").includes("w-1/2")
    );
    expect(activeNumeral).toBeDefined();
    expect(activeNumeral.children).toContain("٢٠");
    renderer?.unmount();
  });

  it("renders mobile open-book indicator aligned to the outer right edge for odd (right) pages", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <QuranSafha
          page={21}
          lines={{}}
          pageMetadata={{ ...dummyMetadata, page_number: 21 } as any}
          locale="ar"
          stackPeekSide="right"
          compensateStackGap
        />
      );
    });

    const root = renderer!.root;
    const footer = root.find((el) => (el.props?.className ?? "").includes("fq-safha-footer"));
    expect(footer).toBeDefined();
    expect(footer.props.dir).toBe("ltr");
    expect(footer.props.className).toContain("justify-end");
    expect(footer.props.className).toContain("pr-4");

    // Book indicator active numeral span for right page is right-0
    const activeNumeral = root.find((el) =>
      (el.props?.className ?? "").includes("right-0") && (el.props?.className ?? "").includes("w-1/2")
    );
    expect(activeNumeral).toBeDefined();
    expect(activeNumeral.children).toContain("٢١");
    renderer?.unmount();
  });

  it("preserves centered diamonds footer for md+ screens", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <QuranSafha
          page={20}
          lines={{}}
          pageMetadata={dummyMetadata as any}
          locale="ar"
          stackPeekSide="left"
          compensateStackGap
        />
      );
    });

    const root = renderer!.root;
    const desktopFooter = root.find((el) => (el.props?.className ?? "").includes("hidden md:flex"));
    expect(desktopFooter).toBeDefined();
    expect(desktopFooter.children).toBeDefined();
    renderer?.unmount();
  });
});
