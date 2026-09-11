"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useLocale } from "next-intl";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { cn } from "@/lib/utils";
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

export type NumberComboboxProps = {
  value: number;
  onChange: (value: number) => void;
  values?: number[];
  min?: number;
  max?: number;
  step?: number;
  portalContainer?: HTMLElement | null;
  disabled?: boolean;
  label?: string;
  prefix?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  format?: (value: number) => string;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
  variant?: "default" | "settings";
};

export function computeNumberOptions({
  values,
  min = 1,
  max = 604,
  step = 1,
}: {
  values?: number[];
  min?: number;
  max?: number;
  step?: number;
}): number[] {
  if (values && values.length > 0) return values;
  const arr: number[] = [];
  for (let i = min; i <= max; i += step) {
    arr.push(i);
  }
  return arr;
}

export function formatNumberDisplay(
  n: number,
  locale: string,
  prefix = "",
  format?: (value: number) => string
): string {
  if (format) return format(n);
  const numStr = toLocaleNumeral(n, locale);
  return prefix ? `${prefix} ${numStr}` : numStr;
}

export function NumberCombobox({
  value,
  onChange,
  values,
  min = 1,
  max = 604,
  step = 1,
  portalContainer,
  disabled = false,
  label,
  prefix = "",
  placeholder,
  searchPlaceholder,
  emptyText,
  format,
  className,
  listClassName,
  itemClassName,
  variant = "default",
}: NumberComboboxProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const numbers = useMemo(
    () => computeNumberOptions({ values, min, max, step }),
    [values, min, max, step]
  );

  const displayText = formatNumberDisplay(value, locale, prefix, format);

  const isSettingsVariant = variant === "settings";

  const trigger = (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-label={label ?? placeholder ?? displayText}
          className={cn(
            isSettingsVariant
              ? "fq-section-row w-full rounded-xl border border-border bg-card text-start py-2 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
              : "fq-focus-ring min-h-[44px] flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50",
            className
          )}
        >
          <span className={cn(!isSettingsVariant && "truncate")}>{displayText}</span>
          <ChevronsUpDown
            className={cn(
              isSettingsVariant
                ? "float-end mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-60"
                : "size-3.5 shrink-0 text-muted-foreground opacity-60 flex-none ml-2 rtl:ml-0 rtl:mr-2"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[--radix-popover-trigger-width] p-0",
          !isSettingsVariant && "min-w-[140px] max-w-[90vw]"
        )}
        align="start"
        container={portalContainer}
      >
        <Command>
          <CommandInput
            placeholder={
              searchPlaceholder ??
              placeholder ??
              "Search…"
            }
          />
          <CommandList
            className={cn(
              "fq-scroll-nice",
              !isSettingsVariant && "max-h-56",
              listClassName
            )}
          >
            <CommandEmpty>
              {emptyText ?? "No match."}
            </CommandEmpty>
            <CommandGroup>
              {numbers.map((n) => {
                const isSelected = value === n;
                const formatted = formatNumberDisplay(n, locale, prefix, format);
                return (
                  <CommandItem
                    key={n}
                    value={`${n} ${formatted} ${toLocaleNumeral(n, locale)}`}
                    onSelect={() => {
                      onChange(n);
                      setOpen(false);
                    }}
                    className={cn(
                      isSettingsVariant
                        ? "cursor-pointer text-[13px]"
                        : "min-h-[44px] cursor-pointer text-xs flex items-center justify-between",
                      itemClassName
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          isSettingsVariant ? "me-2 size-3.5" : "size-3.5 flex-none",
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

  if (label) {
    return (
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        {trigger}
      </div>
    );
  }

  return trigger;
}
