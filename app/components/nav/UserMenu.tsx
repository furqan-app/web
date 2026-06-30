"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useTranslations from "@hooks/use-translations";

export const UserMenu = () => {
  const { data: session } = useSession();
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-accent/50 transition-colors">
          <span className="w-7 h-7 rounded-lg bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground flex-none">
            <User className="size-3.5" />
          </span>
          <span>{t("account", "Account")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {session ? (
          <>
            <DropdownMenuItem className="font-medium">
              {session.user?.name}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => signIn()}>
            Sign in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
