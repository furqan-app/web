"use client";

import { useState, useRef, useEffect } from "react";
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
    const [isOpen, setIsOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchFocus = () => {
        if (isSearchQueryValid(query)) setIsOpen(true);
    };

    const handleQueryChange = (value: string) => {
        setQuery(value);
        setIsOpen(isSearchQueryValid(value));
    };

    const closeAll = (open: boolean) => {
        setIsOpen(open);
        setMobileOpen(open);
    };

    const hasResults = (chapters.data?.length || 0) > 0 || (verses.data?.length || 0) > 0;

    return (
        <>
            {/* Desktop: inline search bar */}
            <div ref={searchContainerRef} className="relative w-full max-w-xl mx-auto hidden md:block">
                <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        onFocus={handleSearchFocus}
                        placeholder={t("search.placeholder", "Search the Quran...")}
                        className="font-tajawal ps-9 pe-9"
                    />
                    {isLoading && (
                        <div className="absolute end-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
                {isOpen && isSearchQueryValid(query) && hasResults && (
                    <SearchQueryResults
                        setIsOpen={setIsOpen}
                        chapters={chapters.data || []}
                        verses={verses.data || []}
                    />
                )}
            </div>

            {/* Mobile: search icon trigger */}
            <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent/50 transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label={t("search.placeholder", "Search the Quran...")}
            >
                <Search className="size-5 text-muted-foreground" strokeWidth={1.7} />
            </button>

            {/* Mobile: full-screen search overlay */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent
                    side="top"
                    hideDefaultClose
                    className="h-screen p-0 flex flex-col"
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
                            onClick={() => setMobileOpen(false)}
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
                                setIsOpen={closeAll}
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
