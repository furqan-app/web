"use client";

import { useState, useEffect } from "react";
import { SurahList } from "@components/SurahList";
import { getSurahs } from "@/app/server/actions/getSurahs";
import { SideNavIcon } from "@components/icons/SideNavIcon";
import { Surah } from "@/app/types";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);

  useEffect(() => {
    const fetchSurahs = async () => {
      const { language } = { language: "ar" };
      const surahData = await getSurahs(language);
      setSurahs(surahData);
    };

    fetchSurahs();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <button
        onClick={toggleSidebar}
        className={`fixed top-1/2 transform -translate-y-1/2 z-50 p-2 bg-white dark:bg-black text-black dark:text-white rounded-full shadow-md transition-transform duration-300 ${
          isOpen ? "translate-x-64" : "translate-x-0"
        }`}
      >
        <SideNavIcon isOpen={isOpen} />
      </button>
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } overflow-y-auto`}
      >
        <SurahList surahs={surahs} />
      </aside>
    </div>
  );
};

export default Sidebar;