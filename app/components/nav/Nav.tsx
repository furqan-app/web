"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { UserMenu } from "./UserMenu";
import { SettingsSidebar } from "../SettingsSidebar";
import { FQIconButton } from "@/app/components/ui/FQIconButton";

export const Nav = () => {
  return (
    <nav className="sticky top-0 z-30 bg-background/85 backdrop-blur-sm text-foreground px-4 border-b border-border h-14 flex items-center">
      <div className="flex-1 flex justify-start">
        <FQIconButton asChild>
          <Link href={"/"}>
            <Home className="size-5" />
          </Link>
        </FQIconButton>
      </div>

      <div className="flex-1 flex justify-center">
        <SearchBar />
      </div>

      <div className="flex-1 flex justify-end items-center">
        <UserMenu />
        <SettingsSidebar />
      </div>
    </nav>
  );
};
