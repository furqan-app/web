import { PageMark } from "../server/actions/getPageMarks";

/**
 * A mark is one row per spot (ADR 0025): a required `category` + an optional
 * `comment`, with author info for attribution in the mark dialog. Returns
 * `undefined` when the spot has no mark.
 */
export const getMarkMeta = (mark: PageMark | undefined) => {
  if (!mark) return undefined;
  return {
    category: mark.category,
    comment: mark.comment,
    authorName: mark.author_name ?? null,
    isOwn: mark.is_own,
  };
};
