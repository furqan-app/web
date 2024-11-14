"use client";

import { usePageFont } from "@hooks/use-page-font";
import { Word } from "@types";
import { QuranLine } from "@components/QuranLine";
import { FONT_V1 } from "../constants/font";
import { useQuranFontScale } from "../contexts/QuranFontScaleContext";

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<Word>>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tailwindFontUtility = [
  "md:text-[3.4vh]",
  "md:text-[3.6vh]",
  "md:text-[3.8vh]",
  "md:text-[4vh]",
  "md:text-[4.2vh]",
  "md:text-[4.4vh]",
  "md:text-[4.6vh]",
  "md:text-[4.8vh]",
  "md:text-[5vh]",
  "md:text-[5.2vh]",
  "md:text-[5.4vh]",
  "md:text-[5.6vh]",
  "md:text-[5.8vh]",
  "md:text-[6vh]",
  "md:text-[6.2vh]",
  "md:text-[6.4vh]",
  "md:text-[6.6vh]",
];

export const QuranSafha = ({ page, lines }: QuranSafhaProps) => {
  const { isPending } = usePageFont(page);
  const { quranFontScale } = useQuranFontScale();

  return (
    <div className="fq-full-safha flex justify-center">
      <div className="w-fit py-6 border-b border-b-gray-500">
        <div
          className={`fq-quran-safha text-[4.4vw] md:text-[${FONT_V1.getWordFontSizeByScale(
            quranFontScale
          )}vh]`}
          style={{ fontFamily: isPending ? "var(--uthmanic)" : `v1-p${page}` }}
        >
          {Object.keys(lines).map((line) => (
            <QuranLine
              key={line}
              line={line}
              words={lines[line]}
              fontLoaded={!isPending}
            />
          ))}
        </div>
        <div className="text-black dark:text-white flex justify-center mt-4">
          {page}
        </div>
      </div>
    </div>
  );
};

