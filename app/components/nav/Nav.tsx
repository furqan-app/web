"use client";

import { useLanguage } from "@contexts/LanguageContext";
import Link from "next/link";

export const Nav = () => {
  const { language, setLanguage, isRTL } = useLanguage();

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

      <button
        className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
        onClick={() => document.documentElement.classList.toggle("dark")}
      >
        {document.documentElement.classList.contains("dark") ? (
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
              d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
            />
          </svg>
        ) : (
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
              d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
            />
          </svg>
        )}
      </button>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
                    rounded px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors 
                    cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </nav>
  );
};

