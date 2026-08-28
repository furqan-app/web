"use client";

import { useState } from "react";
import { SurahResult } from "@types";
import { HomeContinueReadingCard } from "@components/home/HomeContinueReadingCard";
import { HomeRecommendedSurahs } from "@components/home/HomeRecommendedSurahs";
import { HomeSearch } from "@components/home/HomeSearch";

type Props = {
  surahs: SurahResult[];
};

// One client boundary around the interactive band of the home page so the
// continue-reading card, recommended chips and search field react to a single
// query string. Idle state renders everything (matching SSR); an active query
// hides the extras and lets results own the page.
export const HomeSearchSection = ({ surahs }: Props) => {
  const [query, setQuery] = useState("");
  const isFiltering = query.trim().length > 0;

  return (
    <>
      {!isFiltering && <HomeContinueReadingCard surahs={surahs} />}
      {!isFiltering && <HomeRecommendedSurahs surahs={surahs} />}
      <HomeSearch surahs={surahs} query={query} onQueryChange={setQuery} />
    </>
  );
};
