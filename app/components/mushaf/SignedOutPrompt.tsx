"use client";

import { signIn } from "next-auth/react";
import { LogIn, Share2 } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { isNativePlatform } from "@/app/utils/platform";
import { openSystemBrowserSignin } from "@/app/lib/shell/auth-return";

export const SignedOutPrompt = () => {
  const t = useTranslations();

  // Shell return path (plan mobile-app-capacitor): system browser with the
  // current location as return target inside the shell, plain signIn outside.
  const startSignIn = () => {
    if (isNativePlatform()) {
      void openSystemBrowserSignin();
    } else {
      signIn();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-card px-6 py-12 text-center fq-panel-cast">
      <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary">
        <Share2 className="size-6" strokeWidth={1.6} />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t(
          "mushaf.signedOut",
          "Sign in to share your mushaf or open one shared with you.",
        )}
      </p>
      <button
        onClick={startSignIn}
        className="fq-focus-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform duration-150"
      >
        <LogIn className="size-4" strokeWidth={1.8} />
        {t("signIn", "Sign in")}
      </button>
    </div>
  );
};
