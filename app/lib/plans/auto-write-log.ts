import { storage } from "@/app/utils/storage";

export function getAutoWriteLogKey(
  userId: number | string | null | undefined,
  planId: number,
  trackKey: string,
  date: string,
): string {
  const effectiveUser = userId != null ? String(userId) : "guest";
  return `${effectiveUser}:${planId}:${trackKey}:${date}`;
}

/**
 * Records that a plan assignment was checked off automatically in this session.
 * Provides a durable, zero-schema-change signal so the entry remains distinguishable
 * in the UI and easily reversible for the rest of that local date.
 */
export function recordAutoWritten(
  userId: number | string | null | undefined,
  planId: number,
  trackKey: string,
  date: string,
): void {
  const key = getAutoWriteLogKey(userId, planId, trackKey, date);
  const current = storage.get("autoWrittenProgress") || {};
  current[key] = Date.now();
  storage.set("autoWrittenProgress", current);
}

/**
 * Returns true if this assignment was automatically written on this date.
 */
export function isAutoWritten(
  userId: number | string | null | undefined,
  planId: number,
  trackKey: string,
  date: string,
): boolean {
  const key = getAutoWriteLogKey(userId, planId, trackKey, date);
  const current = storage.get("autoWrittenProgress");
  return Boolean(current && current[key]);
}

/**
 * Clears the auto-written marker when an assignment is unchecked or deleted.
 */
export function clearAutoWritten(
  userId: number | string | null | undefined,
  planId: number,
  trackKey: string,
  date: string,
): void {
  const key = getAutoWriteLogKey(userId, planId, trackKey, date);
  const current = storage.get("autoWrittenProgress");
  if (current && current[key]) {
    delete current[key];
    storage.set("autoWrittenProgress", current);
  }
}

/**
 * Per-user auto-write preference (Issue #598). Stored as a map under the
 * single `awradAutoWriteCompletion` key, scoped exactly like the markers
 * above (`String(userId)`), so user B on a shared browser never inherits
 * user A's choice. Unknown/signed-out user reads as OFF, never as whatever
 * happens to be stored. A legacy global boolean (the pre-per-user shape) is
 * treated as absent and overwritten — never promoted onto an account.
 */
export function isAutoWriteEnabled(userId: number | string | null | undefined): boolean {
  if (userId == null) return false;
  const stored = storage.get("awradAutoWriteCompletion");
  if (!stored || typeof stored !== "object") return false;
  return stored[String(userId)] === true;
}

/**
 * Writes only the calling user's entry in the per-user preference map,
 * leaving every other account's value untouched.
 */
export function setAutoWriteEnabled(
  userId: number | string | null | undefined,
  value: boolean,
): void {
  if (userId == null) return;
  const stored = storage.get("awradAutoWriteCompletion");
  const current: Record<string, boolean> =
    stored && typeof stored === "object" ? { ...stored } : {};
  current[String(userId)] = value;
  storage.set("awradAutoWriteCompletion", current);
}
