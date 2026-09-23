"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import useTranslations from "@hooks/use-translations";
import { Link } from "@/i18n/routing";
import { isNativePlatform } from "@/app/utils/platform";
import {
  handleAppUrl,
  openSystemBrowserSignin,
  parseNativeBootstrapUrl,
  sanitizeNativeTarget,
} from "@/app/lib/shell/auth-return";

type Props = {
  locale: string;
};

// The App Link landing document. In the shell it spends the code (via the
// shared handleAppUrl) and lands the WebView on the deep target; in a plain
// browser or the installed PWA it ignores the code and replaces onto the
// target in the same context — the session already lives there, so this is
// current behavior, preserved (platform fidelity: web→web, PWA→PWA).
export function NativeBootstrapHandler({ locale }: Props) {
  const t = useTranslations();
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (failed) {
      return;
    }
    const href = window.location.href;
    const { target: rawTarget } = parseNativeBootstrapUrl(href);
    const clean = sanitizeNativeTarget(rawTarget, locale);
    setTarget(clean);
    if (!isNativePlatform()) {
      window.location.replace(clean);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ok = await handleAppUrl(href);
      if (!cancelled && !ok) {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [failed, locale]);

  if (!failed) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground">
          {t(
            "nativeBootstrap.status",
            "Finishing sign-in — opening your page…",
          )}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        {t(
          "nativeBootstrap.error",
          "This sign-in link expired. Start again from the app.",
        )}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          // A failed exchange means a spent or expired code, which can never
          // be retried in place — restart at the system-browser step for a
          // fresh code (plan mobile-app-capacitor, Addendum 2026-09-23).
          onClick={() => {
            if (target) {
              void openSystemBrowserSignin(target);
            }
          }}
          className="fq-focus-ring min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.98]"
        >
          {t("nativeBootstrap.retry", "Try again")}
        </button>
        <Link
          href="/"
          locale={locale}
          className="fq-focus-ring min-h-11 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground"
        >
          {t("nativeBootstrap.home", "Home")}
        </Link>
      </div>
    </main>
  );
}
