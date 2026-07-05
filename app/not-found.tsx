import useTranslations from "./hooks/use-translations";

/**
 * App-wide 404. Next routes ALL unmatched URLs here (segment-level not-found only
 * catches explicit notFound() calls), and this renders under the root layout —
 * outside the locale layout, so there's no Nav. Stays a SERVER component (no
 * "use client"): the root layout has no NextIntlClientProvider, so useTranslations
 * only resolves server-side here — and the links are plain <a>, needing no client
 * JS. Two deliberate choices keep it from looking broken:
 *  - Theme tokens (bg-background/text-foreground/text-primary) resolve against the
 *    theme class the inline <head> script sets, so it's fully themed, not stark.
 *  - Links are plain <a> (full navigation), not next/link. A client nav from here
 *    into the locale tree can arrive before that tree's CSS chunk loads (prod),
 *    flashing unstyled; a full load always paints with complete CSS.
 */
export default function Custom404() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-7xl md:text-8xl font-extrabold text-foreground">404</p>

      <div className="mt-4 flex items-center justify-center gap-2.5">
        <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
        <h1 className="text-lg md:text-xl font-bold text-foreground">
          {t("notFound.title", "404 - Page Not Found")}
        </h1>
        <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
      </div>

      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {t(
          "notFound.description",
          "Sorry, the page you are looking for does not exist.",
        )}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/"
          className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.98]"
        >
          {t("notFound.homeLink", "Go back to Home")}
        </a>
        <a
          href="/mushaf"
          className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
        >
          {t("mushaf.navLink", "Shared mushaf")}
        </a>
      </div>
    </div>
  );
}
