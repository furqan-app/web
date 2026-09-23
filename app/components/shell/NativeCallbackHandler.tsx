"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import useTranslations from "@hooks/use-translations";
import { Link } from "@/i18n/routing";
import {
  buildAppLinkUrl,
  readMintCode,
  sanitizeNativeTarget,
} from "@/app/lib/shell/auth-return";

type Props = {
  locale: string;
};

// Runs in the system browser after a shell-initiated sign-in: mints the
// one-time code for the already-authenticated user and hands the App Link
// URL to the OS. Never runs inside the shell itself, so it never checks
// isNativePlatform() — the `native` param is the only mint gate (a stray
// visit without it redirects to the target with no mint, no loop).
//
// Auth state comes from the mint POST's own status (401 = signed out), never
// from useSession(), which cannot tell "no session" from "unknown".
export function NativeCallbackHandler({ locale }: Props) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (failed) {
      return;
    }
    const target = sanitizeNativeTarget(
      searchParams.get("target"),
      locale,
    );
    if (searchParams.get("native") !== "1") {
      window.location.replace(target);
      return;
    }
    let cancelled = false;
    void (async () => {
      let code: string | null = null;
      try {
        // Content-Type matters: the auth middleware only treats
        // application/json callers as API (jsonResponse envelope); anything
        // else is 307-redirected to the HTML sign-in, which is useless here.
        // And jsonResponse() always answers HTTP 200, so the 401 arrives in
        // the body, not the status.
        const response = await fetch("/api/auth/native-bootstrap-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const body = (await response.json().catch(() => null)) as {
          data?: { code?: unknown } | null;
          code?: unknown;
        } | null;
        if (response.status === 401 || body?.code === 401) {
          // Signed out in this browser — run the normal web sign-in, then
          // come back here; the tree resumes with the same target.
          const self = `${window.location.pathname}${window.location.search}`;
          window.location.assign(
            `/api/auth/signin?callbackUrl=${encodeURIComponent(self)}`,
          );
          return;
        }
        code = readMintCode(body);
      } catch {
        code = null;
      }
      if (cancelled) {
        return;
      }
      if (!code) {
        setFailed(true);
        return;
      }
      window.location.assign(
        buildAppLinkUrl(window.location.origin, locale, code, target),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [failed, attempt, locale, searchParams]);

  if (!failed) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground">
          {t(
            "nativeCallback.status",
            "Finishing sign-in — returning you to the app…",
          )}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        {t(
          "nativeCallback.error",
          "Couldn't finish sign-in. Check your connection and try again.",
        )}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="fq-focus-ring min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.98]"
        >
          {t("nativeCallback.retry", "Try again")}
        </button>
        <Link
          href="/"
          locale={locale}
          className="fq-focus-ring min-h-11 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground"
        >
          {t("nativeCallback.home", "Home")}
        </Link>
      </div>
    </main>
  );
}
