export const MARK_CATEGORIES: Array<{
  key: string;
  chip: string;
  labelKey: string;
  defaultLabel: string;
}> = [
  { key: "forgetting", chip: "bg-red-600", labelKey: "markModal.forgetting", defaultLabel: "Forgetting" },
  { key: "similar", chip: "bg-orange-500", labelKey: "markModal.similar", defaultLabel: "Similar" },
  { key: "tashkeel-error", chip: "bg-yellow-400", labelKey: "markModal.tashkeelError", defaultLabel: "Tashkeel error" },
  { key: "tajweed-error", chip: "bg-purple-600", labelKey: "markModal.tajweedError", defaultLabel: "Tajweed error" },
  { key: "linking", chip: "bg-blue-600", labelKey: "markModal.linking", defaultLabel: "Linking" },
  { key: "other", chip: "bg-slate-500", labelKey: "markModal.other", defaultLabel: "Other" },
];

/** Word cap for a truncated verse-text preview (MarkModal target text, marks-list snippet). */
export const VERSE_SNIPPET_WORD_LIMIT = 20;

/** Character cap for a truncated comment preview in a My Marks row. */
export const COMMENT_PREVIEW_CHAR_LIMIT = 60;
