"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import useTranslations from "@/app/hooks/use-translations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type TimeComboboxProps = {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
  triggerTestId?: string;
  popoverTestId?: string;
  searchTestId?: string;
  portalContainer?: HTMLElement | null;
};

const toArabicDigits = (str: string): string =>
  str.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export function formatTimeOption(time: string, locale: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h < 12 ? (locale === "ar" ? "ص" : "AM") : (locale === "ar" ? "م" : "PM");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const h12Str = String(h12).padStart(2, "0");
  const mmStr = String(m).padStart(2, "0");

  if (locale === "ar") {
    return `${toArabicDigits(h12Str)}:${toArabicDigits(mmStr)} ${period}`;
  }
  return `${h12Str}:${mmStr} ${period}`;
}

export const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIME_OPTIONS.push(`${hh}:${mm}`);
  }
}

export function TimeCombobox({
  value,
  onChange,
  disabled = false,
  className,
  triggerTestId = "wird-reminder-time-trigger",
  popoverTestId = "wird-reminder-time-popover",
  searchTestId = "wird-reminder-time-search",
  portalContainer,
}: TimeComboboxProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const displayText = useMemo(
    () => (value ? formatTimeOption(value, locale) : "--:--"),
    [value, locale]
  );

  useEffect(() => {
    if (!open || !value) return;
    const frame = requestAnimationFrame(() => {
      const optionKey = value.replace(":", "");
      const selectedEl = listRef.current?.querySelector(
        `[data-testid="wird-reminder-time-option-${optionKey}"]`
      );
      selectedEl?.scrollIntoView({ block: "center", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-testid={triggerTestId}
          aria-expanded={open}
          aria-label={displayText}
          className={cn(
            "fq-focus-ring min-h-[44px] flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50 disabled:pointer-events-none",
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60 flex-none ml-2 rtl:ml-0 rtl:mr-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-testid={popoverTestId}
        className="w-[--radix-popover-trigger-width] min-w-[160px] max-w-[90vw] p-0"
        align="start"
        container={portalContainer}
      >
        <Command>
          <CommandInput
            data-testid={searchTestId}
            placeholder={t("notifications.settings.searchTime", "Search time…")}
          />
          <CommandList ref={listRef} className="fq-scroll-nice max-h-56">
            <CommandEmpty>
              {t("notifications.settings.noTimeMatch", "No matching time.")}
            </CommandEmpty>
            <CommandGroup>
              {TIME_OPTIONS.map((time) => {
                const isSelected = value === time;
                const formatted = formatTimeOption(time, locale);
                const [hStr, mStr] = time.split(":");
                const hNum = parseInt(hStr, 10);
                const h12 = hNum % 12 === 0 ? 12 : hNum % 12;
                const arTime = toArabicDigits(time);
                const arH12 = toArabicDigits(String(h12));
                const arMin = toArabicDigits(mStr);
                const keywords =
                  hNum < 12
                    ? "am morning ص صباحا صباحاً"
                    : "pm evening م مساء مساءً";
                const searchKeywords = `${time} ${time.replace(":", "")} ${h12}:${mStr} ${h12}${mStr} ${arTime} ${arH12}:${arMin} ${formatted} ${keywords}`;
                const optionKey = time.replace(":", "");

                return (
                  <CommandItem
                    key={time}
                    value={searchKeywords}
                    data-testid={`wird-reminder-time-option-${optionKey}`}
                    onSelect={() => {
                      onChange(time);
                      setOpen(false);
                    }}
                    className="min-h-[44px] cursor-pointer text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "size-3.5 flex-none",
                          isSelected ? "text-primary opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium text-foreground">
                        {formatted}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
