import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAppLinkUrl,
  buildShellSignInUrl,
  handleAppUrl,
  localeOfTarget,
  parseNativeBootstrapUrl,
  readMintCode,
  sanitizeNativeTarget,
} from "./auth-return";

describe("parseNativeBootstrapUrl", () => {
  it("extracts code and target", () => {
    expect(
      parseNativeBootstrapUrl(
        "https://furqan.taha7.com/ar/native-bootstrap?code=abc&target=%2Far%2Fpages%2F300",
      ),
    ).toEqual({ code: "abc", target: "/ar/pages/300" });
  });

  it("returns nulls when the code is absent", () => {
    expect(
      parseNativeBootstrapUrl("https://furqan.taha7.com/ar/pages/300"),
    ).toEqual({ code: null, target: null });
  });

  it("returns nulls for an unparseable URL", () => {
    expect(parseNativeBootstrapUrl("not a url")).toEqual({
      code: null,
      target: null,
    });
  });
});

describe("sanitizeNativeTarget", () => {
  it("keeps locale deep paths with their query", () => {
    expect(
      sanitizeNativeTarget("/ar/pages/300?markWord=2%3A255", "ar"),
    ).toBe("/ar/pages/300?markWord=2%3A255");
  });

  it("falls back to the locale home for off-locale paths", () => {
    expect(sanitizeNativeTarget("/mushaf", "en")).toBe("/en");
    expect(sanitizeNativeTarget("https://evil.com/ar", "ar")).toBe("/ar");
  });

  it("rejects backslashes and nulls", () => {
    expect(sanitizeNativeTarget("/\\evil.com", "ar")).toBe("/ar");
    expect(sanitizeNativeTarget(null, "en")).toBe("/en");
  });
});

describe("localeOfTarget", () => {
  it("reads the locale segment, defaulting to ar", () => {
    expect(localeOfTarget("/en/marks")).toBe("en");
    expect(localeOfTarget("/ar/pages/1")).toBe("ar");
    expect(localeOfTarget("/mushaf")).toBe("ar");
  });
});

describe("buildShellSignInUrl", () => {
  it("nests the native callback with the encoded target", () => {
    const target = "/ar/pages/300?markWord=2%3A255";
    const url = buildShellSignInUrl(target);
    expect(url.startsWith("/api/auth/signin?callbackUrl=")).toBe(true);
    // searchParams.get() already decodes one layer — the nested callback is
    // a relative URL carrying the still-encoded target beneath it.
    const callback = new URL(url, "https://app.test").searchParams.get(
      "callbackUrl",
    );
    expect(callback).not.toBe(null);
    const nested = new URL(callback as string, "https://app.test");
    expect(nested.pathname).toBe("/ar/native-callback");
    expect(nested.searchParams.get("native")).toBe("1");
    expect(nested.searchParams.get("target")).toBe(target);
  });
});

describe("buildAppLinkUrl", () => {
  it("carries code and target on the locale bootstrap path", () => {
    const url = buildAppLinkUrl(
      "https://furqan.taha7.com",
      "ar",
      "abc",
      "/ar/pages/300",
    );
    expect(url).toBe(
      "https://furqan.taha7.com/ar/native-bootstrap?code=abc&target=%2Far%2Fpages%2F300",
    );
  });
});

describe("readMintCode", () => {
  it("reads the envelope code and rejects anything else", () => {
    expect(readMintCode({ data: { code: "abc" }, code: 200 })).toBe("abc");
    expect(readMintCode({ data: null, code: 401 })).toBe(null);
    expect(readMintCode(null)).toBe(null);
    expect(readMintCode({ data: { code: 42 } })).toBe(null);
  });
});

describe("handleAppUrl", () => {
  const assign = vi.fn();
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );

  const stubShell = () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          origin: "https://furqan.taha7.com",
          pathname: "/ar/native-bootstrap",
          search: "",
          assign,
        },
        Capacitor: { isNativePlatform: () => true },
      },
      writable: true,
      configurable: true,
    });
  };

  const stubBrowser = () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          origin: "https://furqan.taha7.com",
          pathname: "/ar/native-bootstrap",
          search: "",
          assign,
        },
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

  const sessionWithUser = () =>
    new Response(JSON.stringify({ user: { id: 7 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const sessionEmpty = () =>
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  // The exchange and the session proof travel different URLs — route the
  // mock by URL like the network would.
  const fetchForExchange = (
    sessionResponder: () => Response,
    onExchange?: () => void,
  ) =>
    vi.fn((url: unknown) => {
      if (typeof url === "string" && url.includes("/api/auth/session")) {
        return Promise.resolve(sessionResponder());
      }
      onExchange?.();
      return Promise.resolve(htmlOk());
    });

  beforeEach(() => {
    assign.mockClear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("is a no-op outside the shell and never fetches", async () => {
    stubBrowser();
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(handleAppUrl(hrefFor("no-native"))).resolves.toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("spends once for concurrent calls and lands on the target", async () => {
    stubShell();
    let exchanges = 0;
    const spy = fetchForExchange(sessionWithUser, () => {
      exchanges += 1;
    });
    globalThis.fetch = spy as unknown as typeof fetch;
    const href = hrefFor("race-code");
    const [first, second] = await Promise.all([
      handleAppUrl(href),
      handleAppUrl(href),
    ]);
    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(exchanges).toBe(1);
    expect(assign).toHaveBeenCalledWith("/ar/pages/300");
  });

  it("lands immediately when the session is already visible", async () => {
    stubShell();
    const spy = fetchForExchange(sessionWithUser);
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(handleAppUrl(hrefFor("fast-session"))).resolves.toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenCalledWith("/ar/pages/300");
  });

  it("waits for a late-committing session before landing", async () => {
    stubShell();
    let sessionCalls = 0;
    const spy = fetchForExchange(() => {
      sessionCalls += 1;
      return sessionCalls < 3 ? sessionEmpty() : sessionWithUser();
    });
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(handleAppUrl(hrefFor("slow-session"))).resolves.toBe(true);
    expect(spy).toHaveBeenCalledTimes(4);
    expect(assign).toHaveBeenCalledWith("/ar/pages/300");
  });

  it("lands anyway when the session never appears", async () => {
    stubShell();
    const spy = fetchForExchange(sessionEmpty);
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(handleAppUrl(hrefFor("ghost-session"))).resolves.toBe(true);
    // One exchange plus the bounded six-poll wait — never worse than today.
    expect(spy).toHaveBeenCalledTimes(7);
    expect(assign).toHaveBeenCalledWith("/ar/pages/300");
  });

  it("rejects the JSON envelope and HTML error pages alike", async () => {
    stubShell();
    const jsonSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 401 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = jsonSpy as unknown as typeof fetch;
    await expect(handleAppUrl(hrefFor("spent-code"))).resolves.toBe(false);
    const htmlSpy = vi.fn().mockResolvedValue(
      new Response("proxy error", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );
    globalThis.fetch = htmlSpy as unknown as typeof fetch;
    await expect(handleAppUrl(hrefFor("proxy-code"))).resolves.toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
