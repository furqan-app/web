export type HighlightType = 'search' | 'selection' | 'last-read' | 'red-mark' | 'blue-mark' | 'green-mark';

type HighlightOptions = {
  verseKey: string;
  pageNumber: number;
  type?: HighlightType;
  searchParams?: URLSearchParams;
};

const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  'search': 'bg-hl-blue rounded-sm',
  'selection': 'bg-hl-blue rounded-sm',
  'last-read': 'bg-hl-green rounded-sm',
  'red-mark': 'bg-hl-red rounded-sm',
  'blue-mark': 'bg-hl-blue rounded-sm',
  'green-mark': 'bg-hl-green rounded-sm',
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
