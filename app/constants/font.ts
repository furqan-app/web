export const FONT_V1 = {
    baseScaleViewHeight: 3.4,
    wordHeightForBaseScale: 50,
    getWordFontSizeByScale: (scale: number) => parseFloat((FONT_V1.baseScaleViewHeight + (scale * .2)).toFixed(1)),
    getWordHeightForScale: (scale: number) => FONT_V1.wordHeightForBaseScale + 3 * scale
}
