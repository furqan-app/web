/**
 * Normalize NextAuth logger payloads for fq-logger/Sentry (plan
 * fix-native-auth-link-scope, #715). NextAuth hands the logger Error
 * instances and small metadata objects ({ providerId }) — never tokens,
 * codes, or cookies (verified against next-auth@4.24.10 core/routes/*) —
 * but Errors serialize poorly in structured logs, so expand them to plain
 * data first. Sensitive-key redaction still happens in fq-logger itself.
 */
export function toLogDetail(message: unknown[]): unknown[] {
  return message.map((item) =>
    item instanceof Error
      ? { name: item.name, message: item.message, stack: item.stack }
      : item,
  );
}
