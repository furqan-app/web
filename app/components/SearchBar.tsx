"use client";

import { useState, useRef, useEffect } from "react";
import { useSearch } from "@hooks/use-search";
import Link from "next/link";
import { addHighlightParam } from "@/app/utils/highlight";

export const SearchBar = () => {
    const [query, setQuery] = useState("");
    const { verses, chapters, isLoading } = useSearch(query);
    const [isOpen, setIsOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

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
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(e.target.value.length > 0);
                    }}
                    onFocus={handleSearchFocus}
                    placeholder="Search the Quran..."
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
                <div className="absolute w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
          border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto z-50">
                     {chapters.data && chapters.data.length > 0 && (
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    Surahs ({chapters.data.length})
                                </span>
                            </div>
                            {chapters.data.map((chapter) => (
                                <Link
                                    key={chapter.id}
                                    href={`/pages/${chapter.pages.split('-')[0]}`}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {chapter.name_simple}
                                        </span>
                                        <span className="font-surahnames text-xl">
                                            {chapter.name_arabic}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {verses.data && verses.data.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    Verses ({verses.data.length})
                                </span>
                            </div>
                            {verses.data.map((verse) => (
                                <Link
                                    key={verse.verse_key}
                                    href={addHighlightParam(`/pages/${verse.page_number}`, verse.verse_key)}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {verse.chapter_name} - {verse.verse_key.split(':')[1]}
                                    </div>
                                    <div className="text-right font-uthmanic text-lg">
                                        {verse.text_uthmani}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};