"use client";

import { SearchBar } from "@components/search/SearchBar";
import { UserMenu } from "./UserMenu";
import { SettingsSidebar } from "../SettingsSidebar";
import { FurqanLogo } from "./FurqanLogo";

export const Nav = () => {
  return (
    <nav className="bg-background text-foreground px-4 shadow h-14 flex items-center">
      <div className="flex-1 flex justify-start">
        <FurqanLogo />
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
