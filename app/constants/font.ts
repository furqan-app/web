export const FONT_V1 = {
    baseScaleViewHeight: 3.4,
    getWordFontSizeByScale: (scale: number) => parseFloat((FONT_V1.baseScaleViewHeight + (scale * .2)).toFixed(1)),
}
