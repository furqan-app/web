"use client";

import { useEffect, useState } from "react";

import { routing } from "@/i18n/routing";
import { storage } from "@/app/utils/storage";

// Upper bound of the valid reader range (decisions/pwa.md launch contract).
const TOTAL_PAGES = 604;

type Props = {
  label: string;
};

// Recovery link for the 404 boundary, rendered inside Custom404 — which lives
// outside the locale layout (no intl provider, no contexts), so the label is
// resolved server-side and passed as a prop while only the href resolves
// client-side, from the single-writer `lastReadPath` key. A mount-only storage
// read is safe here (unlike Nav, see decisions/nav.md): the 404 page is
// terminal — no reader sync is mounted, so nothing can write a newer value
// while this is displayed. Plain <a>, never next/link (decisions/api.md: a
// client nav from a 404 boundary can paint before the locale tree's CSS loads).
// Validation mirrors the launch contract in decisions/pwa.md: locale from the
// routing config, page bounded to 1–604. Absent or malformed → default-locale
// page 1.
function resolveReturnPath(): string {
  const fallback = `/${routing.defaultLocale}/pages/1`;
  const stored = storage.get("lastReadPath");
  if (typeof stored !== "string") return fallback;
  const match = stored.match(/^\/([a-z]{2})\/pages\/(\d{1,3})$/);
  if (!match) return fallback;
  const [, locale, pageStr] = match;
  const page = Number(pageStr);
  if (!(routing.locales as readonly string[]).includes(locale)) return fallback;
  if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES) return fallback;
  // Normalized from the parsed page, never the raw string: storage is
  // JSON-shaped but not canonical-shaped (e.g. "/ar/pages/007" parses yet
  // matches no static param, so echoing it back would link to another 404).
  return `/${locale}/pages/${page}`;
}

export function ReturnToReadingLink({ label }: Props) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    setHref(resolveReturnPath());
  }, []);

  // Render nothing before mount so SSR and the first client paint agree — the
  // href only exists in the browser, and guessing it server-side would
  // hydration-mismatch.
  if (href === null) return null;

  return (
    <a
      href={href}
      className="fq-focus-ring inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-[hsl(var(--well)/var(--well-alpha))] active:scale-[0.98]"
    >
      {label}
    </a>
  );
}
