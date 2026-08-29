import { TafsirSegment } from "@/app/types/tafsir";
export { normalizeVerseKey } from "@/app/utils/quran-navigation";

/**
 * Strips HTML entity encodings into plain text characters.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
}

/**
 * Normalizes Quranic text quotes into standardized `﴿...﴾` brackets.
 * Strips outer curly braces `{...}`, parentheses `(...)`, quotes `"..."`, and guillemets `«...»`.
 */
export function normalizeQuranBracket(text: string): string {
  let cleaned = decodeHtmlEntities(text).trim();

  // Strip outer matching brackets/quotes
  cleaned = cleaned.replace(/^[{(«"“'\s]+|[})»"”'\s]+$/g, "").trim();

  // Strip any existing Quranic brackets to prevent double-wrapping
  cleaned = cleaned.replace(/^[﴿\s]+|[﴾\s]+$/g, "").trim();

  if (!cleaned) return "";
  return `﴿${cleaned}﴾`;
}

/**
 * Parses raw QDC HTML commentary into structured, typed segments.
 * Segments allow native React rendering without `dangerouslySetInnerHTML`.
 */
export function parseTafsirSegments(rawHtml: string | null | undefined): TafsirSegment[] {
  if (!rawHtml || typeof rawHtml !== "string" || !rawHtml.trim()) {
    return [];
  }

  const segments: TafsirSegment[] = [];

  // Match tags with content or self-closing tags
  const tokenRegex =
    /<span\s+class=["']([^"']*(?:arabic|qpc-hafs|green)[^"']*)["'][^>]*>([\s\S]*?)<\/span>|<span\s+class=["']([^"']*reference[^"']*)["'][^>]*>([\s\S]*?)<\/span>|<(\/?[a-z0-9]+)(?:\s+[^>]*?)?>|(\[\s*(?:ص:|سورة|كتاب)[\s\S]*?\])/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(rawHtml)) !== null) {
    const textBefore = rawHtml.substring(lastIndex, match.index);
    if (textBefore) {
      processPlainText(textBefore, segments);
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // Group 1 & 2: Quran Quote Span
      const rawQuoteContent = stripAllTags(match[2]);
      const normalizedQuote = normalizeQuranBracket(rawQuoteContent);
      if (normalizedQuote) {
        segments.push({ type: "quran", text: normalizedQuote });
      }
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // Group 3 & 4: Reference Span
      const refText = decodeHtmlEntities(stripAllTags(match[4])).trim();
      if (refText) {
        segments.push({ type: "reference", text: refText });
      }
    } else if (match[5] !== undefined) {
      // Group 5: Tag (e.g. <p>, </p>, <br>)
      const tagName = match[5].toLowerCase();
      if (tagName === "p" || tagName === "/p" || tagName === "br") {
        segments.push({ type: "text", text: "\n" });
      }
      // Other tags (like plain <span>, </span>, blue, red) are cleanly unwrapped
    } else if (match[6] !== undefined) {
      // Group 6: Text citation like [ ص: 132 ] or [ سورة البقرة : 146 ]
      const refText = decodeHtmlEntities(match[6]).trim();
      if (refText) {
        segments.push({ type: "reference", text: refText });
      }
    }

    lastIndex = tokenRegex.lastIndex;
  }

  const remainingText = rawHtml.substring(lastIndex);
  if (remainingText) {
    processPlainText(remainingText, segments);
  }

  return mergeAndCleanSegments(segments);
}

/**
 * Processes plain text portions, identifying any inline brackets or citations.
 */
function processPlainText(text: string, segments: TafsirSegment[]): void {
  const decoded = decodeHtmlEntities(text);
  if (!decoded) return;

  // Detect explicit bracketed citations like [ ص: 132 ]
  const citationRegex = /(\[\s*(?:ص:|سورة|كتاب)[\s\S]*?\])/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = citationRegex.exec(decoded)) !== null) {
    const before = decoded.substring(lastIdx, m.index);
    if (before) {
      segments.push({ type: "text", text: before });
    }
    segments.push({ type: "reference", text: m[1].trim() });
    lastIdx = citationRegex.lastIndex;
  }

  const rest = decoded.substring(lastIdx);
  if (rest) {
    segments.push({ type: "text", text: rest });
  }
}

/**
 * Strips all HTML tags from an inner string.
 */
function stripAllTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Merges adjacent segments of the same type and cleans up extraneous whitespaces.
 */
function mergeAndCleanSegments(segments: TafsirSegment[]): TafsirSegment[] {
  const merged: TafsirSegment[] = [];

  for (const seg of segments) {
    if (!seg.text) continue;

    const prev = merged[merged.length - 1];
    if (prev && prev.type === seg.type) {
      prev.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged
    .map((seg) => {
      if (seg.type === "text") {
        // Clean multiple newlines and spaces in text
        return {
          ...seg,
          text: seg.text.replace(/\n{3,}/g, "\n\n"),
        };
      }
      return seg;
    })
    .filter((seg) => seg.text.length > 0 && (seg.type !== "text" || seg.text.trim().length > 0 || seg.text === "\n"));
}

/**
 * Generates sanitized HTML from raw commentary with stylized Quranic quotes.
 */
export function formatTafsirHtml(rawHtml: string | null | undefined): string {
  const segments = parseTafsirSegments(rawHtml);
  if (segments.length === 0) return "";

  return segments
    .map((seg) => {
      if (seg.type === "quran") {
        return `<span class="font-uthmanic text-primary" dir="rtl">${escapeHtml(seg.text)}</span>`;
      }
      if (seg.type === "reference") {
        return `<span class="text-muted-foreground text-sm" dir="rtl">${escapeHtml(seg.text)}</span>`;
      }
      return escapeHtml(seg.text).replace(/\n/g, "<br />");
    })
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Truncates and formats verse text into an Uthmanic snippet with authentic ﴿...﴾ brackets.
 */
export function formatVerseSnippet(text: string | null | undefined, maxWords = 7): string | null {
  if (!text) return null;
  const cleaned = text.replace(/^[﴿{(«"“'\s]+|[﴾})»"”'\s]+$/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const isTruncated = words.length > maxWords;
  const sliced = words.slice(0, maxWords).join(" ");
  return isTruncated ? `﴿${sliced}…﴾` : `﴿${sliced}﴾`;
}
