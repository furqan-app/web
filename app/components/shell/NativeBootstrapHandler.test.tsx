/**
 * Post-landing session refresh for the App Link landing document (plan
 * fix-native-auth-link-scope, #715) — executed with react-test-renderer.
 * handleAppUrl is mocked at the module boundary (the pure URL helpers stay
 * real); the component effect, translations fallback, and retry UI run
 * unmocked.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { create, act } from "react-test-renderer";
import type { ReactNode } from "react";

import { NativeBootstrapHandler } from "./NativeBootstrapHandler";

declare global {
  // Required by react-test-renderer's act(); `var` is mandatory syntax here.
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const { updateMock, handleAppUrlMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  handleAppUrlMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: updateMock }),
}));

vi.mock("@hooks/use-translations", () => ({
  default: () => (key: string, fallback?: string) => fallback ?? key,
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/lib/shell/auth-return", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("@/app/lib/shell/auth-return")>();
  return { ...real, handleAppUrl: handleAppUrlMock };
});

const assign = vi.fn();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const stubShellWindow = (href: string) => {
  const url = new URL(href);
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        origin: url.origin,
        href,
        pathname: url.pathname,
        search: url.search,
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

afterEach(() => {
  updateMock.mockReset();
  handleAppUrlMock.mockReset();
  assign.mockClear();
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    delete (globalThis as Record<string, unknown>).window;
  }
});

describe("NativeBootstrapHandler", () => {
  it("refreshes the shared session after a successful exchange", async () => {
    stubShellWindow(hrefFor("good-code"));
    handleAppUrlMock.mockResolvedValueOnce(true);

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeBootstrapHandler locale="ar" />);
    });

    expect(handleAppUrlMock).toHaveBeenCalledTimes(1);
    expect(handleAppUrlMock.mock.calls[0]?.[0]).toContain("code=good-code");
    // The spent code committed the cookie elsewhere; the provider must
    // refetch so the landing renders signed-in without a manual reload.
    expect(updateMock).toHaveBeenCalledTimes(1);
    renderer?.unmount();
  });

  it("shows retry UI without refreshing on a failed exchange", async () => {
    stubShellWindow(hrefFor("spent-code"));
    handleAppUrlMock.mockResolvedValueOnce(false);

    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<NativeBootstrapHandler locale="ar" />);
    });

    expect(updateMock).not.toHaveBeenCalled();
    const text = JSON.stringify(renderer?.toJSON());
    expect(text).toContain("This sign-in link expired");
    renderer?.unmount();
  });
});
