import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import { Locale } from "@/app/types/config";
import { NativeCallbackHandler } from "@/app/components/shell/NativeCallbackHandler";

// System-browser leg of the shell sign-in return (plan mobile-app-capacitor,
// Addendum 2026-09-23). The interactive work lives in the client handler —
// this page only sets the locale and bounds the useSearchParams bail-out in
// Suspense so the route stays statically prerenderable (same shape as the
// search page).
export default function NativeCallbackPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);
  return (
    <Suspense>
      <NativeCallbackHandler locale={locale} />
    </Suspense>
  );
}
