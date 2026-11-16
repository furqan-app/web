/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import { SearchBar } from "./SearchBar";

vi.mock("@hooks/use-search", () => ({
  useSearch: () => ({
    chapters: { data: { results: [{ id: 1, name_arabic: "الفاتحة", name_simple: "Al-Fatihah" }] } },
    verses: { data: { results: [], total: 0 } },
    isLoading: false,
  }),
}));

vi.mock("@hooks/use-translations", () => ({
  default: () => (_key: string, fallback?: string) => fallback ?? _key,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@hooks/use-reader-base-path", () => ({
  useReaderBasePath: () => "/pages",
}));

vi.mock("@/app/hooks/use-close-on-back-gesture", () => ({
  useCloseOnBackGesture: () => ({ notifyNavigating: vi.fn() }),
}));

vi.mock("./SearchQueryResults", () => ({
  default: () => <div data-testid="search-results" />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  SheetTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
  SheetDescription: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe("SearchBar safe-area and fullscreen header clearance", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wraps the h-14 input row with fq-search-sheet-header and safe-area top/bottom padding", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SearchBar />);
    });

    const header = renderer.root.find((el) =>
      typeof el.props?.className === "string" &&
      el.props.className.includes("fq-search-sheet-header"),
    );
    expect(header.props.className).toContain("pt-[env(safe-area-inset-top,0px)]");

    const innerRow = header.find((el) =>
      typeof el.props?.className === "string" &&
      el.props.className.includes("h-14"),
    );
    expect(innerRow).toBeDefined();

    const footer = renderer.root.find((el) =>
      typeof el.props?.className === "string" &&
      el.props.className.includes("pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"),
    );
    expect(footer).toBeDefined();
  });
});
