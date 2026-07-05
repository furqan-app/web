"use client";

import { usePathname } from "@/i18n/routing";

/**
 * The locale-less base path for in-reader navigation links.
 * Returns "/mushaf/<grant>/pages" when the current route is a granted mushaf
 * view, otherwise "/pages". This keeps navigation (sidebar surah/rub links,
 * search results) inside the grant view instead of silently dropping the
 * viewer back to their own mushaf (ADR 0012).
 */
export const useReaderBasePath = (): string => {
  const pathname = usePathname();
  const match = pathname?.match(/^\/mushaf\/([^/]+)(?:\/|$)/);
  return match ? `/mushaf/${match[1]}/pages` : "/pages";
};
