export const addHighlightParam = (pageUrl: string, verseKey: string) => {
    const url = new URL(pageUrl, window.location.origin);
    url.searchParams.set('highlight', verseKey);
    return url.toString();
};
