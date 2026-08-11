"use client";

import { useDesktopQuranFontSize } from "@contexts/DesktopQuranFontSizeContext";
import { DesktopQuranFontSize } from "@types";
import { Button } from "@/components/ui/button";

const sizes: Array<{ value: DesktopQuranFontSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export const DesktopQuranFontSizeControls = () => {
  const { desktopQuranFontSize, setDesktopQuranFontSize } = useDesktopQuranFontSize();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Quran font size">
      {sizes.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          variant={desktopQuranFontSize === value ? "default" : "ghost"}
          size="sm"
          onClick={() => setDesktopQuranFontSize(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
};
