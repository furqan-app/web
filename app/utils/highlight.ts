export type HighlightType = 'search' | 'selection' | 'bookmark' | 'last-read';

type HighlightOptions = {
  verseKey: string;
  pageNumber: number;
  type?: HighlightType;
  searchParams?: URLSearchParams;
};

const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  'search': 'bg-yellow-200/70 dark:bg-yellow-500/30',
  'selection': 'bg-blue-200/70 dark:bg-blue-500/30',
  'bookmark': 'bg-green-200/70 dark:bg-green-500/30',
  'last-read': 'bg-purple-200/70 dark:bg-purple-500/30',
};

export const highlight = {
  addToUrl: ({ 
    verseKey, 
    pageNumber, 
    type = 'search'
  }: HighlightOptions): string => {
    const url = new URL(`/pages/${pageNumber}`, window.location.origin);
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