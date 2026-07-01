"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, LogIn } from "lucide-react";
import useTranslations from "@hooks/use-translations";

export const AccountCard = () => {
  const { data: session } = useSession();
  const t = useTranslations();

  if (session?.user) {
    return (
      <div className="p-4 rounded-lg bg-muted flex flex-col gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-snug">
            {session.user.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 self-end px-3 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="size-3.5" />
          {t("signOut", "Sign out")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-muted">
      <button
        onClick={() => signIn()}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-foreground hover:bg-accent/50 transition-colors"
      >
        <LogIn className="size-3.5" />
        {t("signIn", "Sign in")}
      </button>
    </div>
  );
};
