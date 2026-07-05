import { randomBytes } from "crypto";

// Crockford-ish alphabet: no 0/O/1/I/L to keep hand-typed codes unambiguous.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generate a short, human-shareable, url-safe one-time code (e.g. "K7Q2MH3P").
 * Uniqueness is enforced at the DB level (`MushafShareCode.code @unique`);
 * callers should retry on a unique-constraint violation.
 */
export const generateShareCode = (length = 8): string => {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
};
