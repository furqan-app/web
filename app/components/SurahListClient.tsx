'use client';

import { useLocale } from "next-intl";
import { useSurahs } from "../hooks/use-surahs";
import { SurahList } from "./SurahList";

const Placeholder = () => (
  <div className="flex flex-col gap-4 p-4">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
    ))}
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-center text-red-600 dark:text-red-400 p-4 rounded-lg">
    <p className="font-medium">Error loading surahs</p>
    <p className="text-sm">{message}</p>
  </div>
);

export const SurahListClient = () => {
  const locale = useLocale();
  const { data: surahs, error, isLoading } = useSurahs(locale);

  if (isLoading) {
    return <Placeholder />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  return <SurahList surahs={surahs || []} />;
};
