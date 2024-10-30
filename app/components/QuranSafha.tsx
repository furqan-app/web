import { Word } from "../types";
import { QuranLine } from "./QuranLine";

type QuranSafhaProps = {
  page: number;
  lines: Record<string, Array<Word>>;
  fontLoaded: boolean;
};

export const QuranSafha = ({ page, lines, fontLoaded }: QuranSafhaProps) => (
  <div className="fq-full-safha flex justify-center">
    <div className="w-fit py-6 border-b border-b-gray-500">
      <div className="fq-quran-safha" style={{ fontFamily: fontLoaded ? `v1-p${page}` : `var(--uthmanic)` }}>
        {Object.keys(lines).map((line) => (
          <QuranLine
            key={line}
            line={line}
            words={lines[line]}
            fontLoaded={fontLoaded}
          />
        ))}
      </div>
      <div className="flex justify-center mt-4">{page}</div>
    </div>
  </div>
);

