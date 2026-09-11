/**
 * Smart completion end-to-end (dwell → offer → confirm → flourish → hide),
 * executed with react-test-renderer — the same reconciler and hook validation
 * as react-dom — against the real PlansWidget + real useSmartCompletion.
 * Guards the #598 confirm path: the write targets only the offered plan, the
 * offer collapses on confirm (no resurrected stale pill), and #597's flourish
 * plays through to auto-hide. Fixtures mirror the browser repro: plan 9
 * (memorize, page-unit, page 77) plus plan 8 (memorize, verse-unit, off-page)
 * so the verse-index fetch fires mid-session exactly like production.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { create, act, type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import { NextIntlClientProvider } from "next-intl";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { getQueryClient } from "@/app/utils/queryClient";
import arMessages from "../../../messages/ar.json";
import chaptersJson from "../../../public/quran/chapters.json";
import versePagesJson from "../../../public/quran/verse-pages/2.json";
import { PlansWidget } from "./PlansWidget";

declare global {
  // Required by react-test-renderer's act(); `var` is mandatory syntax here.
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/ar/pages/77",
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: 1, name: "t", email: "t@t.local" } },
    status: "authenticated",
    update: async () => null,
  }),
}));

vi.mock("@/app/contexts/ReaderPageContext", () => {
  // Stable array identity, mirroring the real provider's useState-held value:
  // a fresh array per render would trip the page-sync effect every render.
  const visiblePages = [77];
  return { useReaderPage: () => ({ visiblePages }) };
});

vi.mock("@/app/contexts/RecitationContext", () => ({
  useRecitation: () => ({
    recitedPage: null,
    status: "idle",
    currentVerseKey: null,
    settings: { playbackSpeed: 1 },
    activeOverride: null,
    play: () => {},
    togglePlayPause: () => {},
  }),
}));

vi.mock("@/app/contexts/NavOverlayContext", () => ({
  useNavOverlay: () => ({ isOverlayMode: false, overlayVisible: true }),
}));

vi.mock("@hooks/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

const plan9Assignment = (completed: boolean) => ({
  trackKey: "memorizing",
  activity: "memorize",
  unit: "page",
  rangeStart: 77,
  rangeEnd: 77,
  completed,
});

// Verse-unit assignment at the very end of the mushaf (surah 114, page 604):
// off-page-77, so plan 8 must never be offered or written from page 77.
const plan8Assignment = (completed: boolean) => ({
  trackKey: "memorizing",
  activity: "memorize",
  unit: "verse",
  rangeStart: 6231,
  rangeEnd: 6236,
  completed,
});

const todayPayload = (plan9Completed: boolean) => [
  {
    planId: 9,
    templateKey: "memorizing-wird",
    name: "plan 9",
    assignments: [plan9Assignment(plan9Completed)],
  },
  {
    planId: 8,
    templateKey: "memorizing-wird",
    name: "plan 8",
    assignments: [plan8Assignment(false)],
  },
];

describe("PlansWidget smart completion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("dwells, offers, confirms, flourishes, and hides without a hooks crash", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    vi.stubGlobal("window", {
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("document", {
      addEventListener: () => {},
      removeEventListener: () => {},
      visibilityState: "visible",
      hasFocus: () => true,
    });

    let plan9Completed = false;
    const postedPlanIds: number[] = [];
    globalThis.fetch = (async (input: unknown, init?: { method?: string }) => {
      const url = String(input);
      if (url.startsWith("/api/plans/today")) {
        return new Response(JSON.stringify({ success: true, data: todayPayload(plan9Completed) }));
      }
      const progressMatch = url.match(/\/api\/plans\/(\d+)\/progress/);
      if (progressMatch && init?.method === "POST") {
        postedPlanIds.push(Number(progressMatch[1]));
        plan9Completed = true;
        return new Response(JSON.stringify({ success: true, data: {} }));
      }
      if (url === "/quran/chapters.json") {
        return new Response(JSON.stringify(chaptersJson));
      }
      if (url.startsWith("/quran/verse-pages/")) {
        return new Response(JSON.stringify(versePagesJson));
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const queryClient = getQueryClient();
    queryClient.setDefaultOptions({
      queries: { retry: false },
      mutations: { retry: false },
    });

    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <NextIntlClientProvider locale="ar" messages={arMessages} timeZone="UTC">
          <QueryProvider>
            <PlansWidget />
          </QueryProvider>
        </NextIntlClientProvider>,
      );
    });

    const root = () => {
      if (!renderer) throw new Error("renderer not mounted");
      return renderer.root;
    };
    // Radix Trigger spreads data-testid across its composite layers
    // (DialogTrigger > Primitive.button > button); the host node is the real one.
    const hostAll = (testid: string): ReactTestInstance[] =>
      root()
        .findAllByProps({ "data-testid": testid })
        .filter((n) => typeof n.type === "string");
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (let i = 0; i < 100; i++) {
      if (hostAll("plans-widget-trigger").length > 0) break;
      await act(async () => {
        await sleep(20);
      });
    }
    expect(hostAll("plans-widget-trigger").length).toBe(1);

    await act(async () => {
      const w = globalThis.window as unknown as {
        __advanceDwellTimeForTesting?: (seconds: number) => void;
      };
      w.__advanceDwellTimeForTesting?.(61);
    });
    expect(hostAll("smart-completion-offer").length).toBe(1);

    const confirm = hostAll("smart-completion-confirm")[0];
    await act(async () => {
      confirm.props.onClick();
    });

    // The write must target plan 9 only — plan 8 stays untouched.
    for (let i = 0; i < 100; i++) {
      if (postedPlanIds.length > 0) break;
      await act(async () => {
        await sleep(20);
      });
    }
    expect(postedPlanIds).toEqual([9]);

    // The offer collapses immediately on confirm (no resurrected stale pill).
    expect(hostAll("smart-completion-offer").length).toBe(0);

    // #597's flourish plays through and the dial auto-hides afterwards.
    for (let i = 0; i < 100; i++) {
      await act(async () => {
        await sleep(50);
      });
      if (hostAll("plans-widget-trigger").length === 0) break;
    }
    expect(hostAll("plans-widget-trigger").length).toBe(0);

    renderer?.unmount();
    queryClient.clear();
  }, 30000);
});
