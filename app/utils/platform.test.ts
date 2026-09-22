import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { isNativePlatform, isStandaloneDisplayMode, isAndroid } from "./platform";

let originalWindowDescriptor: PropertyDescriptor | undefined;
let originalNavigatorDescriptor: PropertyDescriptor | undefined;

const stubBrowser = (opts: {
  standaloneMedia?: boolean;
  fullscreenMedia?: boolean;
  iosStandalone?: boolean;
  capacitorNative?: boolean;
  userAgent?: string;
}) => {
  const matchMedia = vi.fn((query: string) => ({
    matches:
      (query.includes("standalone") && (opts.standaloneMedia ?? false)) ||
      (query.includes("fullscreen") && (opts.fullscreenMedia ?? false)),
  }));
  Object.defineProperty(globalThis, "window", {
    value: {
      matchMedia,
      ...(opts.capacitorNative === undefined
        ? {}
        : {
            Capacitor: opts.capacitorNative
              ? { isNativePlatform: () => true }
              : {},
          }),
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: {
      userAgent: opts.userAgent ?? "Mozilla/5.0",
      ...(opts.iosStandalone === undefined ? {} : { standalone: opts.iosStandalone }),
    },
    writable: true,
    configurable: true,
  });
};

beforeEach(() => {
  originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
});

afterEach(() => {
  // Restore descriptors exactly (or delete what was originally absent) so no
  // test-global pollution leaks between files in the same worker.
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
  } else {
    delete (globalThis as Record<string, unknown>).window;
  }
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
  } else {
    delete (globalThis as Record<string, unknown>).navigator;
  }
});

describe("isNativePlatform", () => {
  it("is false in a plain browser tab (no Capacitor bridge)", () => {
    stubBrowser({});
    expect(isNativePlatform()).toBe(false);
  });

  it("is true inside the Capacitor shell", () => {
    stubBrowser({ capacitorNative: true });
    expect(isNativePlatform()).toBe(true);
  });

  it("is false when the bridge exists but reports non-native", () => {
    stubBrowser({ capacitorNative: false });
    expect(isNativePlatform()).toBe(false);
  });
});

describe("isStandaloneDisplayMode", () => {
  it("treats the Capacitor shell as standalone even with no display-mode match", () => {
    stubBrowser({ capacitorNative: true });
    expect(isStandaloneDisplayMode()).toBe(true);
  });

  it("stays false in a regular browser tab", () => {
    stubBrowser({});
    expect(isStandaloneDisplayMode()).toBe(false);
  });

  it("preserves the existing standalone/fullscreen/iOS signals", () => {
    stubBrowser({ standaloneMedia: true });
    expect(isStandaloneDisplayMode()).toBe(true);
    stubBrowser({ fullscreenMedia: true });
    expect(isStandaloneDisplayMode()).toBe(true);
    stubBrowser({ iosStandalone: true });
    expect(isStandaloneDisplayMode()).toBe(true);
  });
});

describe("isAndroid", () => {
  it("matches Android user agents only", () => {
    stubBrowser({ userAgent: "Mozilla/5.0 (Linux; Android 14)" });
    expect(isAndroid()).toBe(true);
    stubBrowser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" });
    expect(isAndroid()).toBe(false);
  });
});
