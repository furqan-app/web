"use client";

import { ReactNode, useState } from "react";
import { Check } from "lucide-react";
import useTranslations from "@/app/hooks/use-translations";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const t = useTranslations();
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
        <Command>
          <CommandInput
            placeholder={t("recitation.reciterSearchPlaceholder", "Search reciters…")}
          />
          <CommandList>
            <CommandEmpty>{t("recitation.reciterEmpty", "No reciter found.")}</CommandEmpty>
            <CommandGroup>
              {reciters.map((reciter) => (
                <CommandItem
                  key={reciter.id}
                  value={`${reciter.translatedName} ${reciter.style ?? ""}`}
                  onSelect={() => {
                    onChange(reciter.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={`me-2 size-4 ${reciter.id === value ? "opacity-100 text-primary" : "opacity-0"}`}
                  />
                  <span className="flex flex-col">
                    <span className="text-foreground">{reciter.translatedName}</span>
                    {reciter.style ? (
                      <span className="text-xs text-muted-foreground">{reciter.style}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
