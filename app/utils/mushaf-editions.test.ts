import { describe, it, expect } from "vitest";
import {
  DEFAULT_MUSHAF_ID,
  QCF_V1_MUSHAF_ID,
  QCF_V2_MUSHAF_ID,
  TAJWEED_MUSHAF_ID,
  CANONICAL_PAGE_MUSHAF_ID,
  MUSHAF_EDITIONS,
  MUSHAF_EDITION_IDS,
  getMushafEdition,
} from "./mushaf-editions";
import { PRECACHE_MUSHAF_ID } from "../constants/offline";

describe("mushaf-editions defaults and invariants", () => {
  it("defaults to QCF V1 (1405H) matching the offline precache edition", () => {
    // Regression test for Issue #709: reader default must match PRECACHE_MUSHAF_ID
    // so fresh users do not download 1405H fonts and see missing fonts offline.
    expect(DEFAULT_MUSHAF_ID).toBe(QCF_V1_MUSHAF_ID);
    expect(DEFAULT_MUSHAF_ID).toBe(2);
    expect(DEFAULT_MUSHAF_ID).toBe(PRECACHE_MUSHAF_ID);
  });

  it("keeps canonical page edition on QCF V1", () => {
    expect(CANONICAL_PAGE_MUSHAF_ID).toBe(QCF_V1_MUSHAF_ID);
  });

  it("returns QCF V1 metadata with correct font URLs and families", () => {
    const defaultEdition = getMushafEdition(DEFAULT_MUSHAF_ID);
    expect(defaultEdition.id).toBe(QCF_V1_MUSHAF_ID);
    expect(defaultEdition.fontFamily(1)).toBe("quran-p1");
    expect(defaultEdition.fontUrl(1)).toBe("/fonts/v1/woff2/p1.woff2");
    expect(defaultEdition.usesColorGlyphs).toBe(false);
  });

  it("still provides QCF V2 (1421H) and Tajweed as registered editions", () => {
    expect(MUSHAF_EDITIONS[QCF_V2_MUSHAF_ID]).toBeDefined();
    expect(MUSHAF_EDITIONS[TAJWEED_MUSHAF_ID]).toBeDefined();
    expect(MUSHAF_EDITION_IDS).toContain(QCF_V1_MUSHAF_ID);
    expect(MUSHAF_EDITION_IDS).toContain(QCF_V2_MUSHAF_ID);
    expect(MUSHAF_EDITION_IDS).toContain(TAJWEED_MUSHAF_ID);
  });
});
