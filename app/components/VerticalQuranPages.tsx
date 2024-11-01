"use client";

import { Virtuoso } from "react-virtuoso";

import QuranPage from "./QuranPage";

export const VerticalQuranPages = () => {
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden resize-both border-1 border-ccc">
      <Virtuoso
        className="hidden-scroll h-full"
        totalCount={604}
        itemContent={(index) => <QuranPage key={index + 1} page={index + 1} />}
      />
    </div>
  );
};

