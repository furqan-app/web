"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Link } from "@/i18n/routing";
import useTranslations from "@/app/hooks/use-translations";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  const t = useTranslations();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-7xl md:text-8xl font-extrabold text-foreground">:(</p>

      <div className="mt-4 flex items-center justify-center gap-2.5">
        <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
        <h1 className="text-lg md:text-xl font-bold text-foreground">
          {t("error.title", "Something went wrong")}
        </h1>
        <span className="inline-block rotate-45 text-[6px] text-primary">◆</span>
      </div>

      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {t("error.description", "An unexpected error occurred. Please try again.")}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.98]"
        >
          {t("error.retryLink", "Try again")}
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
        >
          {t("error.homeLink", "Go back to Home")}
        </Link>
      </div>
    </div>
  );
}
