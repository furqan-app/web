"use client";

import { VariableSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { FONT_V1 } from "../constants/font";
import QuranPage from "./QuranPage";

const queryClient = new QueryClient();

const getQuranPageHeight = (index: number) => {
  const lineHeight = FONT_V1.getWordHeightForScale(2);
  if (index > 1) return lineHeight * 15 + 50 + 24; //  + padding + margin
  return lineHeight * 8 + 50 + 24; // + padding + margin
};

export const VerticalQuranPages = () => {
  // const ref = useRef<VariableSizeList | null>(null);

  return (
    <>
      {/* <input
      className="border-2"
        type="text"
        onChange={(e) => {
          const scrollToPage = Number(e.target.value) - 1;
          if (scrollToPage >= 0 && scrollToPage < 604) {
            ref?.current?.scrollToItem(scrollToPage, "center");
          }
        }}
      /> */}
      <QueryClientProvider client={queryClient}>
        <AutoSizer className="auto-sizer">
          {({ height, width }) => (
            <VariableSizeList
              className="w-full min-h-screen hidden-scroll"
              height={height}
              itemCount={604}
              // This is not accurate, but it's good enough for now
              // The height should depend on the scale of the font size and the number of lines in the page
              itemSize={getQuranPageHeight}
              width={width}
              // ref={ref}
            >
              {({ index, style }) => (
                <div style={style}>
                  <QuranPage key={index + 1} page={index + 1} />
                </div>
              )}
            </VariableSizeList>
          )}
        </AutoSizer>
      </QueryClientProvider>
    </>
  );
};

