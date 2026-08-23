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
        <div className="max-h-[300px] overflow-y-auto p-1 divide-y divide-border/20">
          {reciters.map((reciter) => (
            <button
              key={reciter.id}
              type="button"
              onClick={() => {
                onChange(reciter.id);
                setOpen(false);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-start outline-none transition-colors hover:bg-muted/50"
            >
              <Check
                className={`me-2.5 size-3.5 shrink-0 ${reciter.id === value ? "opacity-100 text-primary stroke-[2.5]" : "opacity-0"}`}
              />
              <span className="flex flex-col items-start text-start min-w-0">
                <span className="text-[13px] font-medium text-foreground leading-tight truncate">
                  {reciter.translatedName}
                </span>
                {reciter.style ? (
                  <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {reciter.style}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
