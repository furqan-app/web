"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { SearchBar } from "@components/search/SearchBar";
import { UserMenu } from "./UserMenu";
import { SettingsSidebar } from "../SettingsSidebar";
import { Button } from "@/components/ui/button";

export const Nav = () => {
  return (
    <nav className="bg-background text-foreground px-4 shadow h-14 flex items-center">
      <div className="flex-1 flex justify-start">
        <Button variant="ghost" size="icon" asChild>
          <Link href={"/"} className="dark:hover:bg-zinc-800">
            <Home className="size-5" />
          </Link>
        </Button>
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
