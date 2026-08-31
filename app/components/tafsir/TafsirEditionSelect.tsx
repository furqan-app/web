"use client";

import React, { useState } from "react";
import { BookOpen, Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { TAFSIR_EDITIONS, getTafsirEdition } from "@/app/constants/tafsir";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface TafsirEditionSelectProps {
  selectedId: number;
  onSelect: (id: number) => void;
  portalContainer?: HTMLElement | null;
  disabled?: boolean;
}

export function TafsirEditionSelect({
  selectedId,
  onSelect,
  portalContainer,
  disabled = false,
}: TafsirEditionSelectProps) {
  const t = useTranslations("tafsir");
  const [open, setOpen] = useState(false);

  const selectedEdition = getTafsirEdition(selectedId) ?? TAFSIR_EDITIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label={t("chooseEdition")}
          disabled={disabled}
          className="fq-section-row fq-focus-ring w-full rounded-xl border border-border/80 bg-card/90 py-2 px-3 text-start transition-colors hover:bg-muted/50 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-between"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BookOpen className="size-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
            <span className="text-xs sm:text-[13px] font-medium text-foreground leading-tight truncate">
              {selectedEdition.name}
            </span>
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground opacity-60 ms-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1 shadow-xl border border-border bg-popover rounded-xl max-h-[280px] overflow-y-auto"
        align="start"
        side="bottom"
        sideOffset={6}
        avoidCollisions={false}
        container={portalContainer}
      >
        <div className="flex flex-col gap-0.5 p-0.5">
          {TAFSIR_EDITIONS.map((edition) => {
            const isSelected = edition.id === selectedId;
            return (
              <button
                key={edition.id}
                type="button"
                onClick={() => {
                  onSelect(edition.id);
                  setOpen(false);
                }}
                className="flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-accent/40 active:bg-accent/60 w-full"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-medium text-foreground leading-snug truncate">
                    {edition.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                    {edition.authorName}
                  </span>
                </div>
                {isSelected ? (
                  <Check className="size-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
