"use client";

import { SurahList } from "../SurahList";
import useTranslations from "@/app/hooks/use-translations";
import RubList from "../RubList";
import { SurahResult } from "@types";
import { RubWithVerses } from "@/app/types/prisma";
import { PanelLeftOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocale } from "next-intl";
import { getLanguageDirection } from "@/app/utils/i18n";

type Props = {
  surahs: SurahResult[];
  rubs: RubWithVerses[];
};

const Sidebar = ({ surahs, rubs }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = getLanguageDirection(locale) === "rtl";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-1/2 start-0 -translate-y-1/2 z-50 rounded-none rounded-e-full bg-background shadow-md"
        >
          {isRTL ? (
            <PanelLeftOpen className="size-5 rotate-180" />
          ) : (
            <PanelLeftOpen className="size-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={isRTL ? "right" : "left"} hideDefaultClose className="w-64 top-14 h-[calc(100%-3.5rem)] p-0 flex flex-col overflow-hidden">
        <div className="flex justify-end p-4 border-b shrink-0">
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <Tabs defaultValue="surahs" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full rounded-none justify-around shrink-0">
            <TabsTrigger value="surahs" className="flex-1">
              {t("surahs", "Surahs")}
            </TabsTrigger>
            <TabsTrigger value="rubs" className="flex-1">
              {t("rubs", "Rubs")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="surahs" className="flex-1 overflow-y-auto p-4 mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            <SurahList surahs={surahs} />
          </TabsContent>
          <TabsContent value="rubs" className="flex-1 overflow-y-auto p-4 mt-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            <RubList rubs={rubs} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
