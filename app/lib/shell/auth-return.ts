// Native auth return path (plan mobile-app-capacitor, Addendum 2026-09-23).
//
// The single shell-side place that opens the system browser for sign-in and
// spends the App Link return code. Web/PWA call sites keep their existing
// next-auth signIn() — every action below is gated on isNativePlatform() from
// the shared platform helper, never re-derived.
//
// The Capacitor bridge is always dynamically imported inside the actions so
// the web bundle never carries native plugins. The two pure URL helpers are
// deliberately fetch-free and unit-tested.
import { isNativePlatform } from "@/app/utils/platform";

const NATIVE_PARAM = "native";
const CODE_PARAM = "code";
const TARGET_PARAM = "target";

export type NativeBootstrapLink = {
  code: string | null;
  target: string | null;
};

type MintResponse = {
  data?: { code?: unknown } | null;
  code?: unknown;
};

// Pure: extract the one-time code + deep target from an App Link / page URL.
export function parseNativeBootstrapUrl(href: string): NativeBootstrapLink {
  try {
    const url = new URL(href);
    return {
      code: url.searchParams.get(CODE_PARAM),
      target: url.searchParams.get(TARGET_PARAM),
    };
  } catch {
    return { code: null, target: null };
  }
}

// Pure: client mirror of the exchange route's callback rule — same-origin
// locale paths only, backslashes rejected (WHATWG parsing turns "/\evil.com"
// cross-origin). The query string is preserved (deep targets like the mark
// modal's ?markWord= ride on it); the server re-validates path + origin.
export function sanitizeNativeTarget(
  raw: string | null,
  locale: string,
): string {
  const fallback = `/${locale}`;
  if (!raw || raw.includes("\\") || !raw.startsWith("/")) {
    return fallback;
  }
  const noHash = raw.split("#")[0];
  const queryIndex = noHash.indexOf("?");
  const path = queryIndex === -1 ? noHash : noHash.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? "" : noHash.slice(queryIndex);
  const [head, ...tail] = path.split("/").filter(Boolean);
  if (head !== "ar" && head !== "en") {
    return fallback;
  }
  return `/${[head, ...tail].join("/")}${suffix}`;
}

export function localeOfTarget(target: string): "ar" | "en" {
  return target.startsWith("/en") ? "en" : "ar";
}

// Pure: system-browser sign-in URL carrying the shell's return target. The
// nested callbackUrl is fully encoded — the native-callback page reads
// `native` + `target` back out of it after NextAuth completes.
export function buildShellSignInUrl(target: string): string {
  const clean = sanitizeNativeTarget(target, localeOfTarget(target));
  const locale = localeOfTarget(clean);
  const callback =
    `/${locale}/native-callback` +
    `?${NATIVE_PARAM}=1&${TARGET_PARAM}=${encodeURIComponent(clean)}`;
  return `/api/auth/signin?callbackUrl=${encodeURIComponent(callback)}`;
}

// Pure: App Link return URL the shell intercepts (verification is prod-host
// only per plan — the caller passes its own origin, the prod shell's origin).
export function buildAppLinkUrl(
  origin: string,
  locale: string,
  code: string,
  target: string,
): string {
  const clean = sanitizeNativeTarget(target, locale);
  return (
    `${origin}/${locale}/native-bootstrap` +
    `?${CODE_PARAM}=${encodeURIComponent(code)}` +
    `&${TARGET_PARAM}=${encodeURIComponent(clean)}`
  );
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

// Shell action: open the system browser at sign-in. Defaults to the shell's
// current location so the return lands on the same page (e.g. the mark page).
// The URL is absolutized — the native browser plugin cannot resolve a
// bare path into an intent.
export async function openSystemBrowserSignin(
  target?: string,
): Promise<void> {
  const relative = buildShellSignInUrl(target ?? currentPath());
  const url = new URL(relative, window.location.origin).href;
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

// Concurrent-exchange guard: the App Link launch fires both the appUrlOpen
// listener and the bootstrap page effect for the same code, and losers of
// that race see `spent.count === 0`. One promise per code shares the single
// spend; codes already spent by this session short-circuit to their target
// instead of re-POSTing into a certain 401.
const inflightExchanges = new Map<string, Promise<boolean>>();
const spentCodes = new Map<string, string>();

// Shell action: spend the code (single-use, server-enforced) and land the
// WebView on the target. Returns true when it navigated; false means the
// caller shows retry UI that restarts at the system-browser step (a spent or
// expired code can never be retried in place).
//
// NOTE on response shape: jsonResponse() always answers HTTP 200 — errors
// arrive as a JSON envelope with code >= 400, while success is the followed
// 302 landing on an HTML document. res.ok therefore cannot distinguish them;
// the branch below requires an actually-OK non-JSON document (an HTML error
// page from a proxy/CDN failure must never read as a login).
export async function handleAppUrl(href: string): Promise<boolean> {
  if (!isNativePlatform()) {
    return false;
  }
  const { code, target } = parseNativeBootstrapUrl(href);
  if (!code) {
    return false;
  }
  const clean = sanitizeNativeTarget(target, localeOfTarget(target ?? ""));
  const known = spentCodes.get(code);
  if (known !== undefined) {
    if (`${window.location.pathname}${window.location.search}` !== known) {
      window.location.assign(known);
    }
    return true;
  }
  const pending = inflightExchanges.get(code);
  if (pending !== undefined) {
    return pending;
  }
  const run = spendCode(code, clean).finally(() => {
    inflightExchanges.delete(code);
  });
  inflightExchanges.set(code, run);
  return run;
}

async function spendCode(code: string, clean: string): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch("/api/auth/native-bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, callbackUrl: clean }),
    });
  } catch {
    return false;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || contentType.includes("application/json")) {
    return false;
  }
  spentCodes.set(code, clean);
  // Cookie-commit race (#705): Set-Cookie from the fetch commits
  // asynchronously, and an immediate navigation can outrun it — the landing
  // page then reads signed-out despite a set cookie. Prove the session is
  // visible before landing; fall back to immediate landing on exhaustion
  // (never worse than today — a later refetch still heals).
  await waitForSession();
  window.location.assign(clean);
  return true;
}

type SessionBody = { user?: unknown } | null;

async function readSessionUser(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/session");
    if (!response.ok) {
      return false;
    }
    const body = (await response.json().catch(() => null)) as SessionBody;
    return body?.user !== undefined && body?.user !== null;
  } catch {
    return false;
  }
}

const SESSION_POLL_TRIES = 6;
const SESSION_POLL_GAP_MS = 800;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function waitForSession(): Promise<void> {
  for (let attempt = 0; attempt < SESSION_POLL_TRIES; attempt += 1) {
    if (await readSessionUser()) {
      return;
    }
    await sleep(SESSION_POLL_GAP_MS);
  }
}

export function readMintCode(body: unknown): string | null {
  const code = (body as MintResponse | null)?.data?.code;
  return typeof code === "string" && code.length > 0 ? code : null;
}
