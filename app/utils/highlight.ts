export type HighlightType =
  | 'search'
  | 'selection'
  | 'last-read'
  | 'forgetting-mark'
  | 'similar-mark'
  | 'tashkeel-error-mark'
  | 'tajweed-error-mark'
  | 'linking-mark'
  | 'other-mark';

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
  'forgetting-mark': 'bg-red-400/60 dark:bg-red-400/80',
  'similar-mark': 'bg-orange-300/50 dark:bg-orange-300/80',
  'tashkeel-error-mark': 'bg-yellow-200/60 dark:bg-yellow-300/80',
  'tajweed-error-mark': 'bg-purple-300/50 dark:bg-purple-300/80',
  'linking-mark': 'bg-blue-300/50 dark:bg-blue-300/80',
  'other-mark': 'bg-slate-300/50 dark:bg-slate-300/80',
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

    // Defensive: a stale/unknown HighlightType (e.g. legacy "red-mark") has no
    // entry in HIGHLIGHT_COLORS — render nothing instead of crashing.
    const colorClass = HIGHLIGHT_COLORS[type];
    if (!colorClass) return '';

    return `${colorClass} dark:text-white transition-colors duration-300`;
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
