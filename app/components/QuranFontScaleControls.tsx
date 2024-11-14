"use client";

import { useQuranFontScale } from "@/app/contexts/QuranFontScaleContext";
import { QuranFontScale } from "@types";

export const QuranFontScaleControls = () => {
  const { quranFontScale, setQuranFontScale } = useQuranFontScale();

  const increment = () => change((quranFontScale + 1) as QuranFontScale);

  const decrement = () => change((quranFontScale - 1) as QuranFontScale);

  const change = (newQuranFontScale: QuranFontScale) => {
    setQuranFontScale(Math.min(Math.max(newQuranFontScale, 1), 10) as QuranFontScale);
  };

  return (
    <div className="flex items-center mr-5">
      <button
        onClick={decrement}
        className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-4"
        >
          <path d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
        </svg>
      </button>
      <input
        className="outline-none w-5 h-7 rounded text-center bg-transparent"
        type="text"
        value={quranFontScale}
        readOnly
      />
      <button
        onClick={increment}
        className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-4"
        >
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
      </button>
    </div>
  );
};
