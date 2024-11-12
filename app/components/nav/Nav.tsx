"use client";

// import { useLanguage } from "@contexts/LanguageContext";
import Link from "next/link";
import { ThemeToggle } from "@components/ThemeToggle";
import { QuranFontScaleControls } from "@components/QuranFontScaleControls";
// import { LanguageToggle } from "@components/LanguageToggle";

export const Nav = () => {
  const { isRTL } = { isRTL: false }; // useLanguage();

  return (
    <nav
      className="bg-white dark:bg-black text-black dark:text-white px-4 shadow dark:shadow-slate-600 h-14 flex items-center"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors">
        <Link href={"/"}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
        </Link>
      </div>

      <div className="flex-1" />

      <QuranFontScaleControls />

      <ThemeToggle />

      {/* <LanguageToggle /> */}
    </nav>
  );
};

