export const FONT_V1 = {
    baseScaleViewHeight: 2.9,
    getWordFontSizeByScale: (scale: number) => parseFloat((FONT_V1.baseScaleViewHeight + (scale * .2)).toFixed(1)),
    // Per-line gap as a fraction of the word font size, so vertical rhythm scales
    // with the reading font instead of using a fixed px value. See ADR 0004.
    lineGapRatio: 0.38,
    getLineGapVh: (scale: number) =>
        parseFloat((FONT_V1.getWordFontSizeByScale(scale) * FONT_V1.lineGapRatio).toFixed(2)),
    // A surah heading + Bismillah block occupies exactly 2 line-slots.
    getHeadingBlockVh: (scale: number) =>
        parseFloat((2 * FONT_V1.getWordFontSizeByScale(scale) + FONT_V1.getLineGapVh(scale)).toFixed(2)),
    // Flat readability floor so text/spacing never shrinks below a legible size
    // on short viewports (e.g. DevTools docked open). Same across all scales
    // by design — a readability minimum, not a per-scale preference. See ADR 0006.
    minFontSizePx: 24,
    minLineGapPx: () =>
        parseFloat((FONT_V1.minFontSizePx * FONT_V1.lineGapRatio).toFixed(2)),
    minHeadingBlockPx: () =>
        parseFloat((2 * FONT_V1.minFontSizePx + FONT_V1.minLineGapPx()).toFixed(2)),
    getWordFontSizeCss: (scale: number) =>
        `max(${FONT_V1.minFontSizePx}px,${FONT_V1.getWordFontSizeByScale(scale)}vh)`,
}
