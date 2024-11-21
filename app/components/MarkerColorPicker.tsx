import { BookmarkIcon } from "@heroicons/react/16/solid";
import React from "react";

type Props = {
  onMark: (color: string) => void;
};

export const MarkerColorPicker = ({ onMark }: Props) => {
  const handlePickColor = (color: string) => {
    onMark(color);
  };
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => handlePickColor("red")}
        className="flex gap-2 text-black dark:text-white"
      >
        <BookmarkIcon className="text-red-600 w-6 h-6"></BookmarkIcon> Red Mark
      </button>
      <button
        onClick={() => handlePickColor("blue")}
        className="flex gap-2 text-black dark:text-white"
      >
        <BookmarkIcon className="text-blue-600 w-6 h-6"></BookmarkIcon> Blue
        Mark
      </button>
      <button
        onClick={() => handlePickColor("green")}
        className="flex gap-2 text-black dark:text-white"
      >
        <BookmarkIcon className="text-green-600 w-6 h-6"></BookmarkIcon> Green
        Mark
      </button>
    </div>
  );
};

