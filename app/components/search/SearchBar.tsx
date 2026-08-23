"use client";

import { useState, useEffect } from "react";
import { useSearch } from "@hooks/use-search";
import { isSearchQueryValid } from "@/app/constants/search";
import SearchQueryResults from "./SearchQueryResults";
import useTranslations from "@hooks/use-translations";
import { Input } from "@/components/ui/input";
import { Loader2, Search, SearchX, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

// One shape for idle, loading and no-results, so the overlay never restructures
// itself as the query changes — only its contents do.
const SearchState = ({
    icon,
    title,
    hint,
}: {
    icon: ReactNode;
    title: string;
    hint?: string;
}) => (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="fq-well grid size-12 place-items-center rounded-2xl text-[hsl(var(--control-inert))]">
            {icon}
        </span>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint ? <p className="max-w-xs text-xs text-muted-foreground">{hint}</p> : null}
    </div>
);

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
            {/* Icon trigger, every breakpoint — opens the same overlay below.
                Sits inside the nav's inert well (Nav.tsx), so it carries the
                grouped-control treatment rather than its own background. It
                previously had no focus style at all. */}
            <button
                className="fq-chrome-btn fq-focus-ring size-7"
                onClick={() => setOpen(true)}
                aria-label={t("search.placeholder", "Search the Quran...")}
            >
                <Search className="size-4" strokeWidth={1.8} />
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
                            className="fq-chrome-btn fq-focus-ring size-7"
                            aria-label="Close search"
                        >
                            <ArrowLeft className="size-5" strokeWidth={1.7} />
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
                    {/* Four states, not one. Before this the overlay rendered
                        results and otherwise rendered literally nothing — a
                        typed query with no matches looked identical to an
                        empty box, and a slow query looked like a broken one. */}
                    <div className="flex-1 overflow-y-auto">
                        {!isSearchQueryValid(query) ? (
                            <SearchState
                                icon={<Search className="size-6" strokeWidth={1.6} />}
                                title={t("search.idleTitle", "Search the Quran")}
                                hint={t(
                                    "search.idleHint",
                                    "Type a surah name, a verse number, or a phrase.",
                                )}
                            />
                        ) : isLoading ? (
                            <SearchState
                                icon={<Loader2 className="size-6 animate-spin" strokeWidth={1.6} />}
                                title={t("search.loading", "Searching…")}
                            />
                        ) : hasResults ? (
                            <SearchQueryResults
                                setIsOpen={setOpen}
                                chapters={chapters.data || []}
                                verses={verses.data || []}
                                className="relative w-full mt-0 rounded-none shadow-none border-0 max-h-none"
                            />
                        ) : (
                            <SearchState
                                icon={<SearchX className="size-6" strokeWidth={1.6} />}
                                title={t("search.noResults", "Nothing found")}
                                hint={t(
                                    "search.noResultsHint",
                                    "Try a different spelling, or search by surah number.",
                                )}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};
