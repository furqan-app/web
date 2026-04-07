"use client";

import { useState } from "react";
import { SurahList } from "../SurahList";
import { SideNavIcon } from "@components/icons/SideNavIcon";
import useTranslations from "@/app/hooks/use-translations";
import RubList from "../RubList";
import { SurahResult } from "@types";
import { RubWithVerses } from "@/app/types/prisma";

type Props = {
  surahs: SurahResult[];
  rubs: RubWithVerses[];
};

const Sidebar = ({ surahs, rubs }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'surahs' | 'rubs'>('surahs');
  const t = useTranslations();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <button
        onClick={toggleSidebar}
        className="fixed top-1/2 left-0 transform -translate-y-1/2 z-50 p-2 bg-white dark:bg-black text-black dark:text-white rounded-r-full shadow-md"
      >
        <SideNavIcon isOpen={isOpen} />
      </button>
      <aside
        className={`fixed top-14 left-0 h-[calc(100%-3.5rem)] w-64 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } overflow-y-auto`}
      >
        <div className="p-4">
          <div className="flex justify-around mb-4">
            <button
              onClick={() => setActiveTab('surahs')}
              className={`px-4 py-2 ${activeTab === 'surahs' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800'}`}
            >
              {t('surahs', 'Surahs')}
            </button>
            <button
              onClick={() => setActiveTab('rubs')}
              className={`px-4 py-2 ${activeTab === 'rubs' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800'}`}
            >
              {t('rubs', 'Rubs')}
            </button>
          </div>

          {activeTab === 'surahs' && <SurahList surahs={surahs} />}
          {activeTab === 'rubs' && <RubList rubs={rubs} />}
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
