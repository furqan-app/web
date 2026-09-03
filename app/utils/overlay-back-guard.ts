// Shared "is an overlay's close-on-back-gesture guard currently armed" flag.
// AndroidBackExitGuard checks this before acting on a popstate event and
// defers entirely when armed — see ADR 0043.
// Also maintains an active guard stack so multiple overlapping or nested
// overlays (ADR 0055, issue #472) pop in strict LIFO order on popstate.

export interface OverlayGuardEntry {
  id: number;
}

let armedCount = 0;
const guardStack: OverlayGuardEntry[] = [];

export const armOverlayBackGuard = (entry?: OverlayGuardEntry) => {
  armedCount += 1;
  if (entry) {
    guardStack.push(entry);
  }
};

export const disarmOverlayBackGuard = (id?: number) => {
  armedCount = Math.max(0, armedCount - 1);
  if (id !== undefined) {
    removeOverlayGuard(id);
  }
};

export const isOverlayBackGuardArmed = () => armedCount > 0;

export const getTopOverlayGuard = (): OverlayGuardEntry | undefined =>
  guardStack[guardStack.length - 1];

export const removeOverlayGuard = (id: number) => {
  const idx = guardStack.findIndex((g) => g.id === id);
  if (idx !== -1) {
    guardStack.splice(idx, 1);
  }
};
