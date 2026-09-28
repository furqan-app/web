import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  appLinkTarget,
  readHandledAppLinks,
  markAppLinkHandled,
  HANDLED_APP_LINKS_KEY,
} from "./app-links";

describe("appLinkTarget", () => {
  const emptyHandled = new Set<string>();

  it("accepts valid https share URLs on the prod host", () => {
    const href = "https://furqan.taha7.com/ar/share/verse/2/255";
    expect(appLinkTarget(href, emptyHandled)).toBe("/ar/share/verse/2/255");
  });

  it("keeps query and hash on valid URLs", () => {
    const href = "https://furqan.taha7.com/en/marks?tab=1#section";
    expect(appLinkTarget(href, emptyHandled)).toBe("/en/marks?tab=1#section");
  });

  it("rejects other hosts", () => {
    const href = "https://evil.com/ar/share/verse/2/255";
    expect(appLinkTarget(href, emptyHandled)).toBe(null);
  });

  it("rejects http: URLs", () => {
    const href = "http://furqan.taha7.com/ar/share/verse/2/255";
    expect(appLinkTarget(href, emptyHandled)).toBe(null);
  });

  it("rejects /api paths like /api/auth/signin", () => {
    const href = "https://furqan.taha7.com/api/auth/signin";
    expect(appLinkTarget(href, emptyHandled)).toBe(null);
  });

  it("rejects bare root /", () => {
    const href = "https://furqan.taha7.com/";
    expect(appLinkTarget(href, emptyHandled)).toBe(null);
  });

  it("rejects paths with backslashes", () => {
    const href = "https://furqan.taha7.com/ar\\test";
    expect(appLinkTarget(href, emptyHandled)).toBe(null);
  });

  it("rejects unparsable strings", () => {
    expect(appLinkTarget("not-a-valid-url", emptyHandled)).toBe(null);
  });

  it("returns null when the href is in the handled set", () => {
    const href = "https://furqan.taha7.com/ar/share/verse/2/255";
    const handled = new Set([href]);
    expect(appLinkTarget(href, handled)).toBe(null);
  });

  it("accepts a valid link when no handled set is provided", () => {
    const href = "https://furqan.taha7.com/ar/share/verse/2/255";
    expect(appLinkTarget(href)).toBe("/ar/share/verse/2/255");
  });
});

describe("readHandledAppLinks and markAppLinkHandled", () => {
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

  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let mockStorage: MockSessionStorage;

  beforeEach(() => {
    mockStorage = new MockSessionStorage();
    Object.defineProperty(globalThis, "window", {
      value: { sessionStorage: mockStorage },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("reads empty set when nothing is stored", () => {
    expect(readHandledAppLinks().size).toBe(0);
  });

  it("marks a link handled and reads it back", () => {
    const href = "https://furqan.taha7.com/ar/share/verse/2/255";
    markAppLinkHandled(href);
    const set = readHandledAppLinks();
    expect(set.has(href)).toBe(true);
  });

  it("handles malformed sessionStorage gracefully", () => {
    mockStorage.setItem(HANDLED_APP_LINKS_KEY, "invalid-json");
    expect(readHandledAppLinks().size).toBe(0);
  });
});
