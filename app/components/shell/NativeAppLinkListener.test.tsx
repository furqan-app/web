import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import { App } from "@capacitor/app";
import { NativeAppLinkListener } from "./NativeAppLinkListener";

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

class MockSessionStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  clear() {
    this.store.clear();
  }
}

describe("NativeAppLinkListener", () => {
  const assign = vi.fn();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let mockStorage: MockSessionStorage;

  const stubShellWindow = () => {
    mockStorage = new MockSessionStorage();
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          origin: "https://furqan.taha7.com",
          pathname: "/ar",
          search: "",
          hash: "",
          assign,
        },
        sessionStorage: mockStorage,
        Capacitor: { isNativePlatform: () => true },
      },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stubShellWindow();
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("navigates to cold launch URL on mount", async () => {
    const shareUrl = "https://furqan.taha7.com/ar/share/verse/2/255";
    mockApp.getLaunchUrl.mockResolvedValueOnce({ url: shareUrl });
    mockApp.addListener.mockResolvedValueOnce({ remove: vi.fn() });

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAppLinkListener />);
    });

    expect(assign).toHaveBeenCalledWith("/ar/share/verse/2/255");
    renderer?.unmount();
  });

  it("does not navigate again when remounting with the same launch URL (sessionStorage guard)", async () => {
    const shareUrl = "https://furqan.taha7.com/ar/share/verse/2/255";
    mockApp.getLaunchUrl.mockResolvedValue({ url: shareUrl });
    mockApp.addListener.mockResolvedValue({ remove: vi.fn() });

    let renderer1: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer1 = create(<NativeAppLinkListener />);
    });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/ar/share/verse/2/255");
    renderer1?.unmount();

    // Remounting in the same session with same cold URL
    let renderer2: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer2 = create(<NativeAppLinkListener />);
    });
    // Should still be 1 call from the first mount
    expect(assign).toHaveBeenCalledTimes(1);
    renderer2?.unmount();
  });

  it("navigates on warm appUrlOpen event", async () => {
    mockApp.getLaunchUrl.mockResolvedValueOnce(undefined);
    let appUrlHandler: ((event: { url: string }) => void) | undefined;
    mockApp.addListener.mockImplementation((event: string, cb: (e: { url: string }) => void) => {
      if (event === "appUrlOpen") {
        appUrlHandler = cb;
      }
      return Promise.resolve({ remove: vi.fn() });
    });

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAppLinkListener />);
    });

    expect(assign).not.toHaveBeenCalled();
    expect(appUrlHandler).toBeDefined();

    await act(async () => {
      appUrlHandler?.({ url: "https://furqan.taha7.com/en/share/verse/1/1" });
    });

    expect(assign).toHaveBeenCalledWith("/en/share/verse/1/1");
    renderer?.unmount();
  });

  it("navigates each time when the same URL fires warm appUrlOpen repeatedly", async () => {
    mockApp.getLaunchUrl.mockResolvedValueOnce(undefined);
    let appUrlHandler: ((event: { url: string }) => void) | undefined;
    mockApp.addListener.mockImplementation(
      (event: string, cb: (e: { url: string }) => void) => {
        if (event === "appUrlOpen") {
          appUrlHandler = cb;
        }
        return Promise.resolve({ remove: vi.fn() });
      },
    );

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAppLinkListener />);
    });

    const shareUrl = "https://furqan.taha7.com/ar/share/verse/2/255";

    // First warm open
    await act(async () => {
      appUrlHandler?.({ url: shareUrl });
    });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenLastCalledWith("/ar/share/verse/2/255");

    // Simulate location changed to another path
    window.location.pathname = "/ar/pages/300";

    // Second warm open with the exact same share URL
    await act(async () => {
      appUrlHandler?.({ url: shareUrl });
    });
    expect(assign).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenLastCalledWith("/ar/share/verse/2/255");

    renderer?.unmount();
  });

  it("ignores non-locale URLs", async () => {
    mockApp.getLaunchUrl.mockResolvedValueOnce({
      url: "https://furqan.taha7.com/api/auth/signin",
    });
    mockApp.addListener.mockResolvedValueOnce({ remove: vi.fn() });

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeAppLinkListener />);
    });

    expect(assign).not.toHaveBeenCalled();
    renderer?.unmount();
  });
});
