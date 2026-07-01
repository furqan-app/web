export const MIN_SEARCH_QUERY_LENGTH = 2;

export const isSearchQueryValid = (query: string | null | undefined): query is string =>
    (query ?? '').trim().length >= MIN_SEARCH_QUERY_LENGTH;
