"use client";

import { signIn } from "next-auth/react";
import { LogIn, Target } from "lucide-react";
import useTranslations from "@hooks/use-translations";

export const PlansSignedOutPrompt = () => {
  const t = useTranslations();

  return (
    // See MarksSignedOutPrompt — identity icon, one live control.
    <div className="fq-panel-cast flex flex-col items-center gap-4 rounded-[20px] border border-border bg-card px-6 py-12 text-center">
      <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary">
        <Target className="size-6" strokeWidth={1.6} />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t("plans.signedOut", "Sign in to see your daily awrad and learning plans.")}
      </p>
      <button
        onClick={() => signIn()}
        className="fq-focus-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform duration-150"
      >
        <LogIn className="size-4" strokeWidth={1.8} />
        {t("signIn", "Sign in")}
      </button>
    </div>
  );
};
