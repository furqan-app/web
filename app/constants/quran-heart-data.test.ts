import { describe, it, expect } from "vitest";
import { QURAN_HEART_SURAHS } from "./quran-heart-data";

function pointInPoly(x: number, y: number, pts: number[][]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

describe("QURAN_HEART_SURAHS invariants", () => {
  it("contains exactly 114 surahs numbered 1 to 114 in order", () => {
    expect(QURAN_HEART_SURAHS).toHaveLength(114);
    QURAN_HEART_SURAHS.forEach((s, idx) => {
      expect(s.id).toBe(idx + 1);
      expect(s.name).toBeTruthy();
      expect(s.nameSimple).toBeTruthy();
    });
    expect(QURAN_HEART_SURAHS[0].name).toBe("الفاتحة");
    expect(QURAN_HEART_SURAHS[0].nameSimple).toBe("Al-Fatihah");
    expect(QURAN_HEART_SURAHS[113].name).toBe("الناس");
    expect(QURAN_HEART_SURAHS[113].nameSimple).toBe("An-Nas");
  });

  it("every surah has its visual centroid strictly inside its polygon boundary", () => {
    QURAN_HEART_SURAHS.forEach((s) => {
      const matches = s.path.match(/([0-9.]+),([0-9.]+)/g) || [];
      const pts = matches.map((m) => m.split(",").map(Number));
      const inside = pointInPoly(s.cx, s.cy, pts);
      expect(inside, `Surah ${s.id} (${s.name}) centroid (${s.cx}, ${s.cy}) is outside its polygon`).toBe(true);
    });
  });

  it("every surah has a readable font size of at least 8.5px", () => {
    QURAN_HEART_SURAHS.forEach((s) => {
      expect(s.fontSize).toBeGreaterThanOrEqual(8.5);
    });
  });

  it("surahs follow a top-to-bottom spatial progression", () => {
    // Al-Fatihah (1) is in the upper aorta, An-Nas (114) is at the apex
    expect(QURAN_HEART_SURAHS[0].cy).toBeLessThan(250);
    expect(QURAN_HEART_SURAHS[113].cy).toBeGreaterThan(800);
  });
});
