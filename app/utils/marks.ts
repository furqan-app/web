type MarkAction = {
  name: string;
  value: string;
  author_name?: string | null;
  is_own?: boolean;
};

export const getColorMark = (marks: Array<MarkAction>) =>
  marks.find((action) => action.name === "color")?.value;

/**
 * The color mark plus who made it, for attribution in the mark dialog.
 * `isOwn` defaults to true when absent (older/self-only shapes).
 */
export const getColorMarkMeta = (marks: Array<MarkAction>) => {
  const mark = marks.find((action) => action.name === "color");
  if (!mark) return undefined;
  return {
    value: mark.value,
    authorName: mark.author_name ?? null,
    isOwn: mark.is_own ?? true,
  };
};

export const getNoteMark = (marks: Array<MarkAction>) =>
  marks.find((action) => action.name === "note")?.value;

/**
 * The note mark plus who made it, for attribution in the mark dialog. Read
 * independently from getColorMarkMeta — a shared mushaf can have a different
 * author per mark_type on the same word/verse (ADR 0021).
 * `isOwn` defaults to true when absent (older/self-only shapes).
 */
export const getNoteMarkMeta = (marks: Array<MarkAction>) => {
  const mark = marks.find((action) => action.name === "note");
  if (!mark) return undefined;
  return {
    value: mark.value,
    authorName: mark.author_name ?? null,
    isOwn: mark.is_own ?? true,
  };
};
