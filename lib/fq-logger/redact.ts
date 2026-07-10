export const SENSITIVE_KEYS = [
  "email",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
];

const REDACTED = "[Redacted]";

/**
 * Manual recursive redaction for the Edge shim, mirroring pino's `redact.paths`
 * behavior (case-sensitive key match, matched at any nesting depth) so both
 * runtimes scrub the same fields before a log line or Sentry payload is built.
 */
export const redact = <T>(value: T, seen = new WeakSet<object>()): T => {
  if (value instanceof Error) {
    // Error's `message`/`stack` are non-enumerable, so the generic object
    // branch below (Object.entries) would otherwise silently produce `{}`.
    return { name: value.name, message: value.message, stack: value.stack } as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen)) as unknown as T;
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.includes(key) ? REDACTED : redact(val, seen);
    }
    return result as T;
  }

  return value;
};
