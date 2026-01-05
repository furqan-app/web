"use client";

import { useState, useRef, useEffect } from "react";
import { useSearch } from "@hooks/use-search";
import SearchQueryResults from "./SearchQueryResults";
import useTranslations from "@hooks/use-translations";

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
        <div ref={searchContainerRef} className="relative w-full max-w-3xl">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(e.target.value.length > 0);
                    }}
                    onFocus={handleSearchFocus}
                    placeholder={t('search.placeholder', 'Search the Quran...')}
                    className="w-full px-4 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none 
            focus:ring-2 focus:ring-blue-500"
                />
                {isLoading && (
                    <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-transparent"></div>
                    </div>
                )}
            </div>

            {isOpen && query.length > 0 && hasResults && (
                <SearchQueryResults setIsOpen={setIsOpen} chapters={chapters.data || []} verses={verses.data || []} />
            )}
        </div>
    );
};
