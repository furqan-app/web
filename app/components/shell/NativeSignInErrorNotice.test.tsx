import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import { NativeSignInErrorNotice } from "./NativeSignInErrorNotice";
import { NATIVE_SIGNIN_ERROR_EVENT } from "@/app/lib/shell/native-signin";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `trans_${key}`,
}));

describe("NativeSignInErrorNotice", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let isNative = false;
  let eventListeners: Map<string, Set<(e: Event) => void>>;

  const stubWindow = () => {
    eventListeners = new Map();
    Object.defineProperty(globalThis, "window", {
      value: {
        addEventListener: (type: string, listener: (e: Event) => void) => {
          if (!eventListeners.has(type)) {
            eventListeners.set(type, new Set());
          }
          eventListeners.get(type)!.add(listener);
        },
        removeEventListener: (type: string, listener: (e: Event) => void) => {
          eventListeners.get(type)?.delete(listener);
        },
        dispatchEvent: (event: Event) => {
          eventListeners.get(event.type)?.forEach((cb) => cb(event));
          return true;
        },
        Capacitor: { isNativePlatform: () => isNative },
      },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("renders nothing when not native, even if event is dispatched", async () => {
    isNative = false;
    stubWindow();

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeSignInErrorNotice />);
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent(NATIVE_SIGNIN_ERROR_EVENT));
    });

    expect(renderer?.toJSON()).toBeNull();
    renderer?.unmount();
  });

  it("renders role=alert when native, verifies motion-reduce class, and hides after 5000ms", async () => {
    vi.useFakeTimers();
    isNative = true;
    stubWindow();

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeSignInErrorNotice />);
    });

    expect(renderer?.toJSON()).toBeNull();

    await act(async () => {
      window.dispatchEvent(new CustomEvent(NATIVE_SIGNIN_ERROR_EVENT));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tree = renderer?.toJSON() as any;
    expect(tree).not.toBeNull();
    expect(tree.props.role).toBe("alert");
    expect(tree.props.className).toContain("motion-reduce:transition-none");

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(renderer?.toJSON()).toBeNull();
    renderer?.unmount();
    vi.useRealTimers();
  });
});
