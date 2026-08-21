"use client";

import { ReactNode, useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Reciter } from "@/app/types/recitation";

type Props = {
  reciters: Reciter[];
  value: number | null;
  onChange: (id: number) => void;
  portalContainer: HTMLElement | null;
  trigger: (ctx: { selected: Reciter | null; open: boolean }) => ReactNode;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
};

export const ReciterCombobox = ({
  reciters,
  value,
  onChange,
  portalContainer,
  trigger,
  contentClassName = "w-[--radix-popover-trigger-width] p-0",
  align = "start",
  side,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selected = reciters.find((r) => r.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger({ selected, open })}</PopoverTrigger>
      <PopoverContent
        className={contentClassName}
        align={align}
        side={side}
        container={portalContainer}
      >
        <div className="max-h-[300px] overflow-y-auto p-1">
          {reciters.map((reciter) => (
            <button
              key={reciter.id}
              type="button"
              onClick={() => {
                onChange(reciter.id);
                setOpen(false);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[hsl(var(--well)/var(--well-alpha))]"
            >
              <Check
                className={`me-2 size-4 shrink-0 ${reciter.id === value ? "opacity-100 text-primary" : "opacity-0"}`}
              />
              <span className="flex flex-col items-start text-start">
                <span className="text-foreground">{reciter.translatedName}</span>
                {reciter.style ? (
                  <span className="text-xs text-muted-foreground">{reciter.style}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
