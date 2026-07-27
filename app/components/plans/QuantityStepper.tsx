"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
};

const BUTTON_CLASS =
  "grid size-9 flex-none place-items-center rounded-full border-[1.5px] border-primary text-primary transition-colors hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 duration-150";

// -/+ circular stepper flanking a directly-editable centered number, matching
// the Claude Design reference's pages/day controls (listening wird, husun's
// hifz qty) with typing added — clicking +/- 20 times to go 40 -> 20 is bad UX.
export const QuantityStepper = ({ value, onChange, min = 1 }: Props) => {
  // Local draft so a mid-edit empty/partial field doesn't clamp on every
  // keystroke — only committed (clamped to an integer >= min) on blur.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const n = Math.floor(Number(raw));
    onChange(Number.isFinite(n) ? Math.max(min, n) : value);
    setDraft(null);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="-"
        className={BUTTON_CLASS}
      >
        <Minus className="size-4" strokeWidth={2.4} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-10 border-0 bg-transparent text-center text-2xl font-extrabold tabular-nums text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="+"
        className={BUTTON_CLASS}
      >
        <Plus className="size-4" strokeWidth={2.4} />
      </button>
    </div>
  );
};
