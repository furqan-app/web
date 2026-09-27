// Single shared source of truth for Navigation API feature detection and types
// across AndroidBackExitGuard and useCloseOnBackGesture (ADR 0045, ADR 0074).

export interface FQNavigateEvent extends Event {
  navigationType: "push" | "replace" | "reload" | "traverse";
  userInitiated: boolean;
  intercept: (options?: { handler?: () => Promise<void> | void }) => void;
}

// Minimal structural type for the Navigation API surface used across Furqan guards.
// TypeScript's default DOM lib does not ship one yet, and `window.navigation` is
// absent on older browsers — so the property is optional and every read is guarded.
export interface FQNavigation {
  currentEntry?: { key?: string };
  addEventListener: (type: "navigate", listener: (e: FQNavigateEvent) => void) => void;
  removeEventListener: (type: "navigate", listener: (e: FQNavigateEvent) => void) => void;
}

export const getNavigation = (): FQNavigation | undefined =>
  typeof window === "undefined"
    ? undefined
    : (window as Window & { navigation?: FQNavigation }).navigation;

export const supportsNavigationApi = (): boolean =>
  typeof getNavigation()?.addEventListener === "function";
