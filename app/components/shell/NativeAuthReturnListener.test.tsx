/**
 * Cold-start coverage for the app-wide return listener (plan
 * auth-coldstart-launch-url, #687) — executed with react-test-renderer, the
 * same harness as the smart-completion spec. The `@capacitor/app` bridge is
 * mocked; the real `handleAppUrl` runs against a mocked fetch, and the shell
 * `window` (bridge + location) is stubbed the way platform.test.ts does it.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import { App } from "@capacitor/app";

import { NativeAuthReturnListener } from "./NativeAuthReturnListener";

vi.mock("@capacitor/app", () => ({
  App: {
    getLaunchUrl: vi.fn(),
    addListener: vi.fn(),
  },
}));

const mockApp = App as unknown as {
  getLaunchUrl: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
};

const assign = vi.fn();
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const stubShellWindow = () => {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        origin: "https://furqan.taha7.com",
        pathname: "/ar",
        search: "",
        assign,
      },
      Capacitor: { isNativePlatform: () => true },
    },
    writable: true,
    configurable: true,
  });
};

const hrefFor = (code: string) =>
  `https://furqan.taha7.com/ar/native-bootstrap?code=${code}&target=%2Far%2Fpages%2F300`;

const htmlOk = () =>
  new Response("<html></html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });

afterEach(() => {
  vi.clearAllMocks();
  assign.mockClear();
  globalThis.fetch = originalFetch;
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    delete (globalThis as Record<string, unknown>).window;
  }
});

describe("NativeAuthReturnListener", () => {
  it("exchanges the cold-start launch URL on mount", async () => {
    stubShellWindow();
    mockApp.getLaunchUrl.mockResolvedValueOnce({
      url: hrefFor("coldstart-code"),
    });
    mockApp.addListener.mockResolvedValueOnce({ remove: vi.fn() });
    const fetchSpy = vi.fn().mockResolvedValue(htmlOk());
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAuthReturnListener />);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("/api/auth/native-bootstrap");
    expect(assign).toHaveBeenCalledWith("/ar/pages/300");
    renderer?.unmount();
  });

  it("registers the live subscription when no launch URL exists", async () => {
    stubShellWindow();
    mockApp.getLaunchUrl.mockResolvedValueOnce(undefined);
    const remove = vi.fn();
    mockApp.addListener.mockResolvedValueOnce({ remove });
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAuthReturnListener />);
    });

    expect(App.addListener).toHaveBeenCalledWith(
      "appUrlOpen",
      expect.any(Function),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
    renderer?.unmount();
    expect(remove).not.toHaveBeenCalled();
  });

  it("routes a failed exchange with a code to the retry-owning page", async () => {
    stubShellWindow();
    const href = hrefFor("spent-code");
    mockApp.getLaunchUrl.mockResolvedValueOnce({ url: href });
    mockApp.addListener.mockResolvedValueOnce({ remove: vi.fn() });
    // Envelope error (HTTP 200 per jsonResponse): spend fails.
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 401 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAuthReturnListener />);
    });

    // The bootstrap page at this URL owns the retry UI — the listener must
    // not strand the user on a silent unsigned-in home (#702).
    expect(assign).toHaveBeenCalledWith(href);
    renderer?.unmount();
  });

  it("stays silent when the failing URL carries no code", async () => {
    stubShellWindow();
    mockApp.getLaunchUrl.mockResolvedValueOnce({
      url: "https://furqan.taha7.com/ar/pages/300",
    });
    mockApp.addListener.mockResolvedValueOnce({ remove: vi.fn() });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAuthReturnListener />);
    });

    // Plain deep link: nothing promised, nothing to say.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    renderer?.unmount();
  });
});
