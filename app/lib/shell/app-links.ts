export const APP_LINK_HOST = "furqan.taha7.com";
export const HANDLED_APP_LINKS_KEY = "fq:handled-app-links";

export function isSafeLocalePath(path: string): boolean {
  return /^\/(ar|en)(\/|$)/.test(path) && !path.includes("\\");
}

// Returns the same-origin path to navigate to, or null to ignore.
export function appLinkTarget(
  href: string,
  handled: ReadonlySet<string> = new Set(),
): string | null {
  if (handled.has(href)) return null;
  if (href.includes("\\")) return null;

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== APP_LINK_HOST) {
    return null;
  }

  if (!isSafeLocalePath(url.pathname)) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function readHandledAppLinks(): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const raw = window.sessionStorage.getItem(HANDLED_APP_LINKS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(
        parsed.filter((item): item is string => typeof item === "string"),
      );
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function markAppLinkHandled(href: string): void {
  try {
    if (typeof window === "undefined") return;
    const set = readHandledAppLinks();
    set.add(href);
    window.sessionStorage.setItem(
      HANDLED_APP_LINKS_KEY,
      JSON.stringify(Array.from(set)),
    );
  } catch {
    // Swallow storage errors
  }
}
