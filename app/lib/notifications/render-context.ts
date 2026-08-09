import fs from "fs";
import path from "path";
import { routing } from "@/i18n/routing";
import type { RenderContext } from "@/app/constants/notifications";

const DEFAULT_LOCALE = "ar";

const messagesCache = new Map<string, Record<string, unknown>>();

const loadMessages = (locale: string): Record<string, unknown> | null => {
  const cached = messagesCache.get(locale);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "messages", `${locale}.json`);
  try {
    const messages = JSON.parse(fs.readFileSync(filePath, "utf8"));
    messagesCache.set(locale, messages);
    return messages;
  } catch {
    return null;
  }
};

const lookup = (messages: Record<string, unknown>, key: string): string | undefined => {
  const value = key.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[segment];
    return undefined;
  }, messages);
  return typeof value === "string" ? value : undefined;
};

const interpolate = (template: string, vars?: Record<string, string | number>): string => {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (str, [name, value]) => str.replaceAll(`{{${name}}}`, String(value)),
    template
  );
};

/** Only the app's known locales may ever reach the filesystem read below. */
const toSafeLocale = (locale: string): string =>
  (routing.locales as readonly string[]).includes(locale) ? locale : DEFAULT_LOCALE;

/**
 * Builds a RenderContext outside request scope — the cron path has no
 * `headers()`, so next-intl's `getTranslations` is unusable here. Loads
 * messages/<locale>.json directly.
 */
export const buildRenderContext = (locale: string): RenderContext => {
  const safeLocale = toSafeLocale(locale);
  const messages = loadMessages(safeLocale) ?? loadMessages(DEFAULT_LOCALE) ?? {};

  return {
    locale: safeLocale,
    t: (key, fallback, vars) => {
      const raw =
        lookup(messages, key) ?? lookup(loadMessages(DEFAULT_LOCALE) ?? {}, key) ?? fallback;
      return interpolate(raw, vars);
    },
  };
};
