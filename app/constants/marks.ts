export const MARK_COLORS: Array<{
  key: string;
  chip: string;
  labelKey: string;
  defaultLabel: string;
}> = [
  { key: "red", chip: "bg-red-600", labelKey: "markModal.redMark", defaultLabel: "Red Mark" },
  { key: "blue", chip: "bg-blue-600", labelKey: "markModal.blueMark", defaultLabel: "Blue Mark" },
  { key: "green", chip: "bg-green-600", labelKey: "markModal.greenMark", defaultLabel: "Green Mark" },
];

/** Word cap for a truncated verse-text preview (MarkModal target text, marks-list snippet). */
export const VERSE_SNIPPET_WORD_LIMIT = 20;
