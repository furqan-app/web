import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create, act } from "react-test-renderer";
import { _resetNativePushStateForTests } from "@/app/lib/shell/native-push";
import { NativePushTapListener } from "./NativePushTapListener";

const pushTapMock = vi.hoisted(() => ({
  plugin: null as unknown,
  throwOnce: false,
}));

vi.mock("@capacitor/push-notifications", () => ({
  get PushNotifications() {
    if (pushTapMock.throwOnce) {
      pushTapMock.throwOnce = false;
      throw new Error("chunk load failed");
    }
    return pushTapMock.plugin;
  },
}));

describe("NativePushTapListener", () => {
  const assign = vi.fn();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  const stubWindow = (native: boolean) => {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          origin: "https://furqan.taha7.com",
          pathname: "/ar",
          search: "",
          hash: "",
          assign,
        },
        Capacitor: { isNativePlatform: () => native },
      },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetNativePushStateForTests();
    pushTapMock.plugin = null;
    stubWindow(true);
  });

  afterEach(() => {
    _resetNativePushStateForTests();
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("does nothing outside native platform", async () => {
    stubWindow(false);
    const addListener = vi.fn();
    pushTapMock.plugin = { addListener };

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativePushTapListener />);
    });

    expect(addListener).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    renderer?.unmount();
  });

  it("attaches through Capacitor Proxy without touching .then and navigates on valid locale path", async () => {
    let tapHandler: ((event: { notification?: { data?: { url?: unknown } } }) => void) | undefined;
    const remove = vi.fn();
    let thenAccessed = false;

    const inner = {
      addListener: vi.fn(async (event: string, cb: typeof tapHandler) => {
        if (event === "pushNotificationActionPerformed") {
          tapHandler = cb;
        }
        return { remove };
      }),
    };

    pushTapMock.plugin = new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === "then") {
          thenAccessed = true;
          return () =>
            Promise.reject(
              new Error('"PushNotifications.then()" is not implemented on android')
            );
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativePushTapListener />);
    });

    expect(thenAccessed).toBe(false);
    expect(inner.addListener).toHaveBeenCalledWith(
      "pushNotificationActionPerformed",
      expect.any(Function)
    );

    await act(async () => {
      tapHandler?.({ notification: { data: { url: "/ar/pages/12" } } });
    });

    expect(assign).toHaveBeenCalledWith("/ar/pages/12");

    await act(async () => {
      renderer?.unmount();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("ignores unsafe, root, or non-locale notification URLs", async () => {
    let tapHandler: ((event: { notification?: { data?: { url?: unknown } } }) => void) | undefined;
    pushTapMock.plugin = {
      addListener: vi.fn(async (_event: string, cb: typeof tapHandler) => {
        tapHandler = cb;
        return { remove: vi.fn() };
      }),
    };

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativePushTapListener />);
    });

    await act(async () => {
      tapHandler?.({ notification: { data: { url: "/" } } });
      tapHandler?.({ notification: { data: { url: "https://evil.example/ar/pages/1" } } });
      tapHandler?.({ notification: { data: { url: "/api/notifications/test" } } });
      tapHandler?.({ notification: { data: {} } });
    });

    expect(assign).not.toHaveBeenCalled();
    renderer?.unmount();
  });

  it("removes the listener handle if unmounted before addListener resolves", async () => {
    const remove = vi.fn();
    let resolveListener: ((handle: { remove: () => void }) => void) | undefined;
    pushTapMock.plugin = {
      addListener: vi.fn(
        () =>
          new Promise<{ remove: () => void }>((resolve) => {
            resolveListener = resolve;
          })
      ),
    };

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativePushTapListener />);
    });

    await act(async () => {
      renderer?.unmount();
    });
    await act(async () => {
      resolveListener?.({ remove });
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("handles null export or transient import failure on native platform without crashing", async () => {
    pushTapMock.throwOnce = true;

    let renderer1: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer1 = create(<NativePushTapListener />);
    });
    expect(assign).not.toHaveBeenCalled();
    await act(async () => {
      renderer1?.unmount();
    });

    // Null plugin export after recovery also no-ops safely.
    pushTapMock.plugin = null;
    let renderer2: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer2 = create(<NativePushTapListener />);
    });
    expect(assign).not.toHaveBeenCalled();
    await act(async () => {
      renderer2?.unmount();
    });
  });
});
