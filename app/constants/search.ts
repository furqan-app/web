export const MIN_SEARCH_QUERY_LENGTH = 2;

export const isSearchQueryValid = (query: string | null | undefined): query is string =>
    (query ?? '').trim().length >= MIN_SEARCH_QUERY_LENGTH;

// Upper bound for one page of verse results. Each row eager-loads its full
// Word[] array, so an uncapped take lets a common term return a payload whose
// render blocks the main thread as the result lands (see decisions/search.md).
// The overlay uses take: 10; the full-results page pages through bounded chunks.
export const MAX_VERSE_TAKE = 50;
export const DEFAULT_VERSE_TAKE = 10;
