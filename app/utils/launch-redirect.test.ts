import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Reads and executes the exact <head> script from public/launch.html inside
// the Vitest jsdom/stubbed window environment.
const launchHtmlPath = path.resolve(__dirname, "../../public/launch.html");
const launchHtmlContent = fs.readFileSync(launchHtmlPath, "utf-8");
const scriptMatch = launchHtmlContent.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  throw new Error("Could not find <script> tag in public/launch.html");
}

const launchScript = scriptMatch[1];

let originalWindowDescriptor: PropertyDescriptor | undefined;
let originalNavigatorDescriptor: PropertyDescriptor | undefined;
let originalLocationDescriptor: PropertyDescriptor | undefined;
let originalLocalStorageDescriptor: PropertyDescriptor | undefined;

type StubOptions = {
  standaloneMedia?: boolean;
  fullscreenMedia?: boolean;
  iosStandalone?: boolean;
  capacitorNative?: boolean;
  isDesktopUp?: boolean;
  storage?: Record<string, string>;
};

const executeLaunchScript = (opts: StubOptions): string => {
  let replacedUrl = "";

  const matchMedia = vi.fn((query: string) => ({
    matches:
      (query.includes("(display-mode: standalone)") && (opts.standaloneMedia ?? false)) ||
      (query.includes("(display-mode: fullscreen)") && (opts.fullscreenMedia ?? false)) ||
      (query.includes("(min-width: 1367px)") && (opts.isDesktopUp ?? false)),
  }));

  const storageMap = new Map<string, string>(
    Object.entries(opts.storage ?? {})
  );

  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const mockLocation = {
    replace: (url: string) => {
      replacedUrl = url;
    },
  };

  Object.defineProperty(globalThis, "window", {
    value: {
      matchMedia,
      location: mockLocation,
      localStorage: mockLocalStorage,
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
      ...(opts.iosStandalone === undefined ? {} : { standalone: opts.iosStandalone }),
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "location", {
    value: mockLocation,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  // Execute the extracted script
  new Function(launchScript)();

  return replacedUrl;
};

beforeEach(() => {
  originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  originalLocationDescriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
});

afterEach(() => {
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
  if (originalLocationDescriptor) {
    Object.defineProperty(globalThis, "location", originalLocationDescriptor);
  } else {
    delete (globalThis as Record<string, unknown>).location;
  }
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorageDescriptor);
  } else {
    delete (globalThis as Record<string, unknown>).localStorage;
  }
});

describe("public/launch.html redirect logic", () => {
  describe("Capacitor native shell", () => {
    it("redirects to lastReadPath when valid on mobile viewport", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/150"),
        },
      });
      expect(target).toBe("/ar/pages/150");
    });

    it("supports en locale in lastReadPath", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/en/pages/604"),
        },
      });
      expect(target).toBe("/en/pages/604");
    });

    it("falls back to legacy numeric lastReadPage when lastReadPath is absent", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPage: JSON.stringify(42),
        },
      });
      expect(target).toBe("/pages/42");
    });

    it("falls back to /pages/1 on fresh install (no keys)", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {},
      });
      expect(target).toBe("/pages/1");
    });

    it("falls back to /pages/1 when lastReadPath is corrupted or invalid", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("https://evil.com"),
        },
      });
      expect(target).toBe("/pages/1");
    });

    it("falls back to /pages/1 when page number exceeds 604", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/999"),
        },
      });
      expect(target).toBe("/pages/1");
    });

    it("falls back to legacy lastReadPage when lastReadPath is invalid or corrupted", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/invalid/path"),
          lastReadPage: JSON.stringify(88),
        },
      });
      expect(target).toBe("/pages/88");
    });

    it("handles malformed JSON in localStorage without throwing", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: "{malformed_json",
          lastReadPage: "not_a_number",
        },
      });
      expect(target).toBe("/pages/1");
    });

    it("handles non-string lastReadPath in storage", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify(123),
        },
      });
      expect(target).toBe("/pages/1");
    });

    it("handles boundary page numbers (page 0 or page 605)", () => {
      const target0 = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/0"),
        },
      });
      expect(target0).toBe("/pages/1");

      const target605 = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/605"),
        },
      });
      expect(target605).toBe("/pages/1");
    });

    it("floors floating point legacy lastReadPage numbers", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: false,
        storage: {
          lastReadPage: JSON.stringify(42.8),
        },
      });
      expect(target).toBe("/pages/42");
    });

    it("redirects to home (/) on desktop breakpoint", () => {
      const target = executeLaunchScript({
        capacitorNative: true,
        isDesktopUp: true,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/150"),
        },
      });
      expect(target).toBe("/");
    });
  });

  describe("PWA standalone, fullscreen, and browser fallback", () => {
    it("redirects to lastReadPath in standalone display mode", () => {
      const target = executeLaunchScript({
        standaloneMedia: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/300"),
        },
      });
      expect(target).toBe("/ar/pages/300");
    });

    it("redirects to lastReadPath in fullscreen display mode", () => {
      const target = executeLaunchScript({
        fullscreenMedia: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/300"),
        },
      });
      expect(target).toBe("/ar/pages/300");
    });

    it("redirects to lastReadPath when navigator.standalone is true (iOS PWA)", () => {
      const target = executeLaunchScript({
        iosStandalone: true,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/300"),
        },
      });
      expect(target).toBe("/ar/pages/300");
    });

    it("redirects to home (/) in a regular browser tab", () => {
      const target = executeLaunchScript({
        standaloneMedia: false,
        capacitorNative: false,
        isDesktopUp: false,
        storage: {
          lastReadPath: JSON.stringify("/ar/pages/300"),
        },
      });
      expect(target).toBe("/");
    });
  });

  describe("Capacitor configuration and packaging contract", () => {
    it("asserts capacitor.config.ts configures appStartPath to /launch.html", async () => {
      const capacitorConfigModule = await import("../../capacitor.config");
      const config = capacitorConfigModule.default;
      expect(config.server?.appStartPath).toBe("/launch.html");
      expect(config.webDir).toBe("native-shell-web");
    });

    it("verifies sentinel launch.html exists in native-shell-web for iOS", () => {
      const sentinelPath = path.resolve(__dirname, "../../native-shell-web/launch.html");
      expect(fs.existsSync(sentinelPath)).toBe(true);
      const stat = fs.statSync(sentinelPath);
      expect(stat.size).toBeGreaterThan(0);
      expect(stat.size).toBeLessThan(1024); // lightweight sentinel
    });

    it("verifies public/launch.html has synchronous script located inside <head>", () => {
      const headIndex = launchHtmlContent.indexOf("<head>");
      const closeHeadIndex = launchHtmlContent.indexOf("</head>");
      const scriptIndex = launchHtmlContent.indexOf("<script>");

      expect(headIndex).toBeGreaterThan(-1);
      expect(closeHeadIndex).toBeGreaterThan(headIndex);
      expect(scriptIndex).toBeGreaterThan(headIndex);
      expect(scriptIndex).toBeLessThan(closeHeadIndex);
    });
  });
});
