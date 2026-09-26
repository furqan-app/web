import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import { AndroidBackExitGuard } from "./AndroidBackExitGuard";
import * as platform from "@/app/utils/platform";
import * as standaloneHook from "@/app/hooks/use-is-standalone-mobile-or-tablet";
import * as overlayBackGuard from "@/app/utils/overlay-back-guard";

const exitNativeAppMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/app/lib/shell/back-button", () => ({
  exitNativeApp: () => exitNativeAppMock(),
}));

import { type FQNavigateEvent } from "@/app/utils/navigation-api";

// Mock ExitToast to avoid rendering full markup
vi.mock("./ExitToast", () => ({
  ExitToast: ({ show }: { show: boolean }) => (show ? "ExitToast:visible" : null),
}));

const mockNavigateEvent = (overrides?: Partial<FQNavigateEvent>): FQNavigateEvent =>
  ({
    type: "navigate",
    navigationType: "traverse",
    userInitiated: true,
    intercept: vi.fn(),
    ...overrides,
  }) as unknown as FQNavigateEvent;

describe("AndroidBackExitGuard", () => {
  const pushStateSpy = vi.fn();
  const windowCloseSpy = vi.fn();

  let navListeners: { type: string; listener: (e: FQNavigateEvent) => void }[] = [];
  let popstateListeners: ((e: Event) => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    navListeners = [];
    popstateListeners = [];

    const win = {
      history: {
        pushState: pushStateSpy,
      },
      close: windowCloseSpy,
      addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "popstate") {
          popstateListeners.push(listener as (e: Event) => void);
        }
      }),
      removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "popstate") {
          popstateListeners = popstateListeners.filter((l) => l !== listener);
        }
      }),
      navigation: {
        addEventListener: vi.fn((type: string, listener: (e: FQNavigateEvent) => void) => {
          if (type === "navigate") {
            navListeners.push({ type, listener });
          }
        }),
        removeEventListener: vi.fn((type: string, listener: (e: FQNavigateEvent) => void) => {
          if (type === "navigate") {
            navListeners = navListeners.filter((l) => l.listener !== listener);
          }
        }),
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: win,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "history", {
      value: win.history,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(platform, "isAndroid").mockReturnValue(true);
    vi.spyOn(platform, "isNativePlatform").mockReturnValue(false);
    vi.spyOn(standaloneHook, "useIsStandaloneMobileOrTablet").mockReturnValue(true);
    vi.spyOn(overlayBackGuard, "isOverlayBackGuardArmed").mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (typeof window !== "undefined") {
      delete (window as unknown as Record<string, unknown>).Capacitor;
    }
  });

  it("does not activate when active=false", () => {
    act(() => {
      create(<AndroidBackExitGuard active={false} />);
    });

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(navListeners.length).toBe(0);
    expect(popstateListeners.length).toBe(0);
  });

  it("does not activate when not standalone mobile/tablet", () => {
    vi.spyOn(standaloneHook, "useIsStandaloneMobileOrTablet").mockReturnValue(false);

    act(() => {
      create(<AndroidBackExitGuard active={true} />);
    });

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("pushes initial guardState and arms navigation listeners on mount", () => {
    act(() => {
      create(<AndroidBackExitGuard active={true} />);
    });

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith({ fqExitGuard: true }, "");
    expect(navListeners.length).toBe(1);
    expect(popstateListeners.length).toBe(1);
  });

  it("handles 1st back press via Navigation API: intercepts and shows toast", () => {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<AndroidBackExitGuard active={true} />);
    });

    expect(renderer?.toJSON()).toBeNull();

    const interceptSpy = vi.fn();
    act(() => {
      navListeners[0]?.listener(
        mockNavigateEvent({
          intercept: interceptSpy,
        })
      );
    });

    expect(interceptSpy).toHaveBeenCalledTimes(1);
    // Pushed once on mount + once on 1st back press to re-arm
    expect(pushStateSpy).toHaveBeenCalledTimes(2);
    expect(renderer?.toJSON()).toBe("ExitToast:visible");
  });

  it("disarms toast after 2 seconds", () => {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<AndroidBackExitGuard active={true} />);
    });

    act(() => {
      navListeners[0]?.listener(mockNavigateEvent());
    });

    expect(renderer?.toJSON()).toBe("ExitToast:visible");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(renderer?.toJSON()).toBeNull();
  });

  it("exits standalone PWA on 2nd back press within 2s", () => {
    vi.spyOn(platform, "isNativePlatform").mockReturnValue(false);

    act(() => {
      create(<AndroidBackExitGuard active={true} />);
    });

    // 1st back press
    act(() => {
      navListeners[0]?.listener(mockNavigateEvent());
    });

    // Advance time slightly (e.g. 500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 2nd back press
    act(() => {
      navListeners[0]?.listener(mockNavigateEvent());
    });

    expect(windowCloseSpy).toHaveBeenCalledTimes(1);
    expect(exitNativeAppMock).not.toHaveBeenCalled();
  });

  it("exits Capacitor app on 2nd back press within 2s", () => {
    Object.assign(window, { Capacitor: { isNativePlatform: () => true } });
    vi.spyOn(platform, "isNativePlatform").mockReturnValue(true);

    act(() => {
      create(<AndroidBackExitGuard active={true} />);
    });

    // 1st back press
    act(() => {
      navListeners[0]?.listener(mockNavigateEvent());
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 2nd back press
    act(() => {
      navListeners[0]?.listener(mockNavigateEvent());
    });

    expect(exitNativeAppMock).toHaveBeenCalledTimes(1);
    expect(windowCloseSpy).not.toHaveBeenCalled();
  });

  it("defers to overlay when an overlay is open", () => {
    vi.spyOn(overlayBackGuard, "isOverlayBackGuardArmed").mockReturnValue(true);

    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<AndroidBackExitGuard active={true} />);
    });

    const interceptSpy = vi.fn();
    act(() => {
      navListeners[0]?.listener(
        mockNavigateEvent({
          intercept: interceptSpy,
        })
      );
    });

    expect(interceptSpy).not.toHaveBeenCalled();
    expect(renderer?.toJSON()).toBeNull();
    // Only mount pushState was called, not re-armed
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores rapid popstate echo within 50ms of Navigation API event", () => {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<AndroidBackExitGuard active={true} />);
    });

    const interceptSpy = vi.fn();
    act(() => {
      navListeners[0]?.listener(
        mockNavigateEvent({
          intercept: interceptSpy,
        })
      );
      // Immediate popstate echo
      popstateListeners[0]?.(new Event("popstate"));
    });

    expect(interceptSpy).toHaveBeenCalledTimes(1);
    // Should NOT be treated as a 2nd press (which would exit)
    expect(windowCloseSpy).not.toHaveBeenCalled();
    expect(exitNativeAppMock).not.toHaveBeenCalled();
    expect(renderer?.toJSON()).toBe("ExitToast:visible");
  });

  it("falls back to popstate when Navigation API is unavailable", () => {
    // Remove navigation API from window
    Object.assign(window, { navigation: undefined });

    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<AndroidBackExitGuard active={true} />);
    });

    expect(navListeners.length).toBe(0);
    expect(popstateListeners.length).toBe(1);

    // 1st popstate press
    act(() => {
      popstateListeners[0]?.(new Event("popstate"));
    });

    expect(pushStateSpy).toHaveBeenCalledTimes(2); // mount + re-arm
    expect(renderer?.toJSON()).toBe("ExitToast:visible");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 2nd popstate press
    act(() => {
      popstateListeners[0]?.(new Event("popstate"));
    });

    expect(windowCloseSpy).toHaveBeenCalledTimes(1);
  });
});
