"use client";

import { useState, useEffect } from "react";
import { useSearch } from "@hooks/use-search";
import { isSearchQueryValid } from "@/app/constants/search";
import SearchQueryResults from "./SearchQueryResults";
import useTranslations from "@hooks/use-translations";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowLeft } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

export const SearchBar = () => {
    const t = useTranslations();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const { verses, chapters, isLoading } = useSearch(debouncedQuery);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const handleQueryChange = (value: string) => {
        setQuery(value);
    };

    const hasResults = (chapters.data?.length || 0) > 0 || (verses.data?.length || 0) > 0;

    return (
        <>
            {/* Icon trigger, every breakpoint — opens the same overlay below
                (matches the reference nav: bare icons, no persistent inline field).
                Plain icon control, no resting background. */}
            <button
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                onClick={() => setOpen(true)}
                aria-label={t("search.placeholder", "Search the Quran...")}
            >
                <Search className="size-5 text-muted-foreground" strokeWidth={1.7} />
            </button>

            {/* Full-screen search overlay */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="top"
                    hideDefaultClose
                    overlayClassName="!z-[52]"
                    className="!z-[52] h-screen p-0 flex flex-col"
                >
                    <SheetTitle className="sr-only">
                        {t("search.placeholder", "Search the Quran...")}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        {t("search.description", "Search for a surah or verse by name or number.")}
                    </SheetDescription>
                    {/* Input row */}
                    <div className="flex items-center gap-2 h-14 px-3 border-b border-border shrink-0">
                        <button
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent/50 transition-colors flex-shrink-0"
                            aria-label="Close search"
                        >
                            <ArrowLeft className="size-5 text-muted-foreground" strokeWidth={1.7} />
                        </button>
                        <div className="relative flex-1">
                            {isLoading && (
                                <div className="absolute end-3 top-1/2 -translate-y-1/2 z-10">
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            <Input
                                type="text"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder={t("search.placeholder", "Search the Quran...")}
                                className="font-tajawal pe-9 bg-muted border-0 focus-visible:ring-0"
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                            />
                        </div>
                    </div>
                    {/* Results */}
                    {isSearchQueryValid(query) && hasResults && (
                        <div className="flex-1 overflow-y-auto">
                            <SearchQueryResults
                                setIsOpen={setOpen}
                                chapters={chapters.data || []}
                                verses={verses.data || []}
                                className="relative w-full mt-0 rounded-none shadow-none border-0 max-h-none"
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
};
