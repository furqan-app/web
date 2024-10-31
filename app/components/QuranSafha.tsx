"use client";

import { usePageFont } from "@hooks/use-page-font";
import { Word } from "@types";
import { QuranLine } from "@components/QuranLine";

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<Word>>;
};

export const QuranSafha = ({ page, lines }: QuranSafhaProps) => {
  const { isPending } = usePageFont(page);

  return (
    <div className="fq-full-safha flex justify-center">
      <div className="w-fit py-6 border-b border-b-gray-500">
        <div className="fq-quran-safha" style={{ fontFamily: isPending ? 'var(--uthmanic)' : `v1-p${page}` }}>
          {Object.keys(lines).map((line) => (
            <QuranLine
              key={line}
              line={line}
              words={lines[line]}
              fontLoaded={!isPending}
            />
          ))}
        </div>
        <div className="text-black dark:text-white flex justify-center mt-4">{page}</div>
      </div>
    </div>
  );
};

