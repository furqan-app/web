import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import { Locale } from "@/app/types/config";
import { NativeBootstrapHandler } from "@/app/components/shell/NativeBootstrapHandler";

// App Link landing document (plan mobile-app-capacitor, Addendum
// 2026-09-23): Android opens the shell here after the system-browser
// sign-in. Same static-shell shape as the callback page — the client
// handler owns the exchange-or-fallback branch.
export default function NativeBootstrapPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);
  return (
    <Suspense>
      <NativeBootstrapHandler locale={locale} />
    </Suspense>
  );
}
