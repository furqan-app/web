'use client';

import { useSurahs } from "../hooks/use-surahs";
import { SurahList } from "./SurahList";

export const SurahListClient = () => {
  // TODO: use locale from i18n
  const { data: surahs, error, isLoading } = useSurahs("ar");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <SurahList surahs={surahs || []} />;
};