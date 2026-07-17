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

/** Marks returned per page by GET /api/marks (cursor pagination). */
export const MARKS_PAGE_LIMIT = 20;

/**
 * A mark's identity as `marked_type + marked_id` — unique per user (ADR
 * 0025). Used both as the pagination cursor (`GET /api/marks`) and as the
 * row key for remove-in-place tracking (MyMarksList), so both stay in sync
 * off one definition.
 */
export const markKey = (mark: { marked_type: string; marked_id: string }) =>
  `${mark.marked_type}:${mark.marked_id}`;
