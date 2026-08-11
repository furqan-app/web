import { DesktopQuranFontSize } from "@types";

// Desktop is a reading preference, not a viewport-height calculation. Every
// consumer of this value (ink, card width, banner fallback and rhythm) resolves
// the same CSS custom property in QuranSafha/globals.css. See ADR 0038.
export const DESKTOP_QURAN_FONT_SIZES: Record<DesktopQuranFontSize, number> = {
  small: 26,
  medium: 28,
  large: 30,
};

export const DEFAULT_DESKTOP_QURAN_FONT_SIZE: DesktopQuranFontSize = "small";

// These rhythm values are ratios of the resolved word size, never independent
// screen-specific measurements. Tajweed's compensated gap is derived so its
// scaled glyphs retain the same 15-line page height as the regular edition.
export const QURAN_LINE_GAP_RATIO = 0.4;
export const QURAN_TAJWEED_FONT_RATIO = 0.85;
export const QURAN_TAJWEED_LINE_GAP_RATIO =
  (1 + QURAN_LINE_GAP_RATIO - QURAN_TAJWEED_FONT_RATIO) /
  QURAN_TAJWEED_FONT_RATIO;
