import type { LucideIcon } from "lucide-react";
import {
  RotateCcw,
  GitCompareArrows,
  ScanText,
  AudioWaveform,
  Link as LinkIcon,
  Ellipsis,
} from "lucide-react";

export type MarkCategory = {
  key: string;
  chip: string;
  badgeBg: string;
  badgeText: string;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
};

export const MARK_CATEGORIES: MarkCategory[] = [
  {
    key: "forgetting",
    chip: "bg-red-600",
    badgeBg: "bg-red-500/15 dark:bg-red-500/20",
    badgeText: "text-red-600 dark:text-red-400",
    icon: RotateCcw,
    labelKey: "markModal.forgetting",
    defaultLabel: "Forgetting",
  },
  {
    key: "similar",
    chip: "bg-orange-500",
    badgeBg: "bg-orange-500/15 dark:bg-orange-500/20",
    badgeText: "text-orange-600 dark:text-orange-400",
    icon: GitCompareArrows,
    labelKey: "markModal.similar",
    defaultLabel: "Similar",
  },
  {
    key: "tashkeel-error",
    chip: "bg-amber-500",
    badgeBg: "bg-amber-500/15 dark:bg-amber-500/20",
    badgeText: "text-amber-600 dark:text-amber-400",
    icon: ScanText,
    labelKey: "markModal.tashkeelError",
    defaultLabel: "Tashkeel error",
  },
  {
    key: "tajweed-error",
    chip: "bg-purple-600",
    badgeBg: "bg-purple-500/15 dark:bg-purple-500/20",
    badgeText: "text-purple-600 dark:text-purple-400",
    icon: AudioWaveform,
    labelKey: "markModal.tajweedError",
    defaultLabel: "Tajweed error",
  },
  {
    key: "linking",
    chip: "bg-blue-600",
    badgeBg: "bg-blue-500/15 dark:bg-blue-500/20",
    badgeText: "text-blue-600 dark:text-blue-400",
    icon: LinkIcon,
    labelKey: "markModal.linking",
    defaultLabel: "Linking",
  },
  {
    key: "other",
    chip: "bg-slate-500",
    badgeBg: "bg-slate-500/15 dark:bg-slate-500/20",
    badgeText: "text-slate-600 dark:text-slate-400",
    icon: Ellipsis,
    labelKey: "markModal.other",
    defaultLabel: "Other",
  },
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

/**
 * (surah, verse, wordPosition) so the list reads in natural Quran order.
 * `marked_id` is `location` ("s:v:w") for word marks, `verse_key` ("s:v")
 * for verse marks — a verse mark has no word segment, so it sorts after
 * every word of that verse (it's triggered at the end-of-verse glyph).
 */
export const getSortKey = (item: { marked_type: string; marked_id: string }) => {
  const [surah, verse, word] = item.marked_id.split(":").map(Number);
  return [surah, verse, item.marked_type === "word" ? word : Infinity];
};
