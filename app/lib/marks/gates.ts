/**
 * Evaluates marking eligibility and input states for MarkModal (#550).
 *
 * Invariants (ADR 0061 & decisions/marks.md):
 * - Online: sessionUser is authoritative for live sign-in state.
 * - Offline: NextAuth session always reports unauthenticated; the sticky ownerStamp
 *   determines whether the device was authenticated before going offline.
 * - Installed PWA: guests (ownerStamp === "guest") can mark in standalone display mode.
 * - Plain browser tab: guests encounter the sign-in wall.
 * - Grant mushaf: remains online-only for writing. Inputs are disabled offline.
 */
export function evaluateMarkModalGates({
  sessionUser,
  ownerStamp,
  isOffline,
  isStandalone,
  grantId,
}: {
  sessionUser: unknown;
  ownerStamp: string;
  isOffline: boolean;
  isStandalone: boolean;
  grantId?: string;
}) {
  const isSignedIn = !isOffline ? Boolean(sessionUser) : ownerStamp !== "guest";
  const canGuestMark = !isSignedIn && !grantId && isStandalone;
  const canMark = isSignedIn || canGuestMark;
  const inputsDisabled = Boolean(grantId && isOffline);

  return { isSignedIn, canGuestMark, canMark, inputsDisabled };
}
