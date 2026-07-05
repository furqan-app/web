export type HighlightType = 'search' | 'selection' | 'last-read' | 'red-mark' | 'blue-mark' | 'green-mark';

type HighlightOptions = {
  verseKey: string;
  pageNumber: number;
  type?: HighlightType;
  searchParams?: URLSearchParams;
  // Locale-less reader base path, e.g. "/pages" (default) or
  // "/mushaf/<grant>/pages" when navigating within a granted mushaf.
  basePath?: string;
};

const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  'search': 'bg-gray-900/10 dark:bg-cyan-600/30',
  'selection': 'bg-blue-200/70 dark:bg-blue-500/30',
  'last-read': 'bg-purple-200/70 dark:bg-purple-500/30',
  'red-mark': 'bg-red-300/50 dark:bg-red-300/80',
  'blue-mark': 'bg-blue-300/50 dark:bg-blue-300/80',
  'green-mark': 'bg-green-300/50 dark:bg-green-300/80',
};

export const highlight = {
  addToUrl: ({
    verseKey,
    pageNumber,
    type = 'search',
    basePath = '/pages'
  }: HighlightOptions): string => {
    const url = new URL(`${basePath}/${pageNumber}`, window.location.origin);
    url.searchParams.set('highlight', verseKey);
    url.searchParams.set('highlight-type', type);
    return url.toString();
  },

  shouldHighlight: (
    word: { verse_key: string }, 
    highlightedVerseKey: string | null
  ): boolean => {
    return highlightedVerseKey === word.verse_key;
  },

  getHighlightClass: (
    isHighlighted: boolean, 
    type: HighlightType = 'search'
  ): string => {
    if (!isHighlighted) return '';
    
    return `${HIGHLIGHT_COLORS[type]} dark:text-white transition-colors duration-300`;
  },

  getHighlightType: (searchParams: URLSearchParams): HighlightType => {
    const type = searchParams.get('highlight-type');
    return (type as HighlightType) || 'search';
  },

  getHighlightedVerseKey: (searchParams: URLSearchParams): string | null => {
    return searchParams.get('highlight');
  },

  clearHighlight: (searchParams: URLSearchParams): URLSearchParams => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('highlight');
    newParams.delete('highlight-type');
    return newParams;
  }
};
