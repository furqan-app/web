"use client";

import { useState, useRef, useEffect } from "react";
import { useSearch } from "@hooks/use-search";
import SearchQueryResults from "./SearchQueryResults";
import useTranslations from "@hooks/use-translations";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

export const SearchBar = () => {
    const t = useTranslations();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const { verses, chapters, isLoading } = useSearch(debouncedQuery);
    const [isOpen, setIsOpen] = useState(false);
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
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearchFocus = () => {
        if (query.length > 0) {
            setIsOpen(true);
        }
    };

    const hasResults = (chapters.data?.length || 0) > 0 || (verses.data?.length || 0) > 0;

    return (
        <div ref={searchContainerRef} className="relative w-full max-w-xl mx-auto">
            <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(e.target.value.length > 0);
                    }}
                    onFocus={handleSearchFocus}
                    placeholder={t('search.placeholder', 'Search the Quran...')}
                    className="font-tajawal ps-9 pe-9"
                />
                {isLoading && (
                    <div className="absolute end-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {isOpen && query.length > 0 && hasResults && (
                <SearchQueryResults setIsOpen={setIsOpen} chapters={chapters.data || []} verses={verses.data || []} />
            )}
        </div>
    );
};
