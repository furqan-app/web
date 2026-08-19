// Shared "is an overlay's close-on-back-gesture guard currently armed" flag.
// AndroidBackExitGuard checks this before acting on a popstate event and
// defers entirely when armed — see ADR 0043. A count, not a boolean, so
// balanced arm/disarm calls (including React StrictMode's double-invoked
// effects in dev) never go negative or get stuck.
let armedCount = 0;

export const armOverlayBackGuard = () => {
  armedCount += 1;
};

export const disarmOverlayBackGuard = () => {
  armedCount = Math.max(0, armedCount - 1);
};

export const isOverlayBackGuardArmed = () => armedCount > 0;
