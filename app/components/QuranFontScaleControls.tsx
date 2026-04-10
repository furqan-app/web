"use client";

import { useQuranFontScale } from "@/app/contexts/QuranFontScaleContext";
import { QuranFontScale } from "@types";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const QuranFontScaleControls = () => {
  const { quranFontScale, setQuranFontScale } = useQuranFontScale();

  const increment = () => change((quranFontScale + 1) as QuranFontScale);

  const decrement = () => change((quranFontScale - 1) as QuranFontScale);

  const change = (newQuranFontScale: QuranFontScale) => {
    setQuranFontScale(Math.min(Math.max(newQuranFontScale, 1), 10) as QuranFontScale);
  };

  return (
    <div className="flex items-center mr-5">
      <Button variant="ghost" size="icon" onClick={decrement}>
        <Minus className="size-4" />
      </Button>
      <input
        className="outline-none w-5 h-7 rounded text-center bg-transparent"
        type="text"
        value={quranFontScale}
        readOnly
      />
      <Button variant="ghost" size="icon" onClick={increment}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
};
