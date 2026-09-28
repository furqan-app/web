"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isNativePlatform } from "@/app/utils/platform";
import { NATIVE_SIGNIN_ERROR_EVENT } from "@/app/lib/shell/native-signin";

export function NativeSignInErrorNotice() {
  const t = useTranslations("nativeSignIn");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleError = () => {
      setVisible(true);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setVisible(false);
      }, 5000);
    };

    window.addEventListener(NATIVE_SIGNIN_ERROR_EVENT, handleError);
    return () => {
      window.removeEventListener(NATIVE_SIGNIN_ERROR_EVENT, handleError);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border border-border bg-card p-4 text-sm text-card-foreground shadow-lg transition-opacity duration-150 motion-reduce:transition-none"
    >
      {t("error")}
    </div>
  );
}
