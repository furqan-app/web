"use client";

import { signIn } from "next-auth/react";
import { LogIn, Bookmark } from "lucide-react";
import useTranslations from "@hooks/use-translations";

export const MarksSignedOutPrompt = () => {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-card px-6 py-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]">
      <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary">
        <Bookmark className="size-6" strokeWidth={1.6} />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t("marks.signedOut", "Sign in to see your marks.")}
      </p>
      <button
        onClick={() => signIn()}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform duration-150"
      >
        <LogIn className="size-4" strokeWidth={1.8} />
        {t("signIn", "Sign in")}
      </button>
    </div>
  );
};
