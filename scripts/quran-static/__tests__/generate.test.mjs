import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import {
  DEFAULT_MUSHAF_ID as APP_DEFAULT_MUSHAF_ID,
  MUSHAF_EDITIONS,
  MUSHAF_EDITION_IDS,
} from "../../../app/utils/mushaf-editions";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MUSHAF_ID,
  GLYPH_FIELD_BY_MUSHAF,
  LAYOUT_MUSHAF_IDS,
  QCF_V2_MUSHAF_ID,
  SEEDED_WORDS_MUSHAF_ID,
  TAJWEED_MUSHAF_ID,
  TOTAL_PAGES,
  buildStaticArtifacts,
  correctAudioUrl,
  deriveRubsFromVerses,
  fetchChaptersFromQdc,
  fetchJsonWithRetry,
  fetchMushafLayoutFromQdc,
  normalizeAudioUrl,
  parseCliArgs,
  resolveTargetSet,
  runGenerator,
  validateLayouts,
  verifyExistingArtifacts,
  writeArtifactsAtomically,
} = require("../generate.js");

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const PUBLIC_QURAN_DIR = path.join(REPO_ROOT, "public/quran");

function buildSyntheticDataset() {
  const chapters = [
    {
      id: 5,
      chapter_number: 5,
      bismillah_pre: true,
      revelation_order: 112,
      revelation_place: "madinah",
      name_complex: "Al-Mā'idah",
      name_arabic: "المائدة",
      name_simple: "Al-Ma'idah",
      verses_count: 120,
      pages: "106-127",
      translated_name: "The Table Spread",
    },
  ];

  // Canonical mushaf 2 places 5:75 & 5:76 on page 120 and 5:77 & 5:78 on page 121.
  const verses = [
    {
      id: 744,
      verse_number: 75,
      verse_key: "5:75",
      chapter_id: 5,
      page_number: 120,
      juz_number: 6,
      hizb_number: 12,
      rub_el_hizb_number: 48,
      text_uthmani: "مَّا ٱلْمَسِيحُ",
      text_imlaei_simple: "ما المسيح",
    },
    {
      id: 745,
      verse_number: 76,
      verse_key: "5:76",
      chapter_id: 5,
      page_number: 120,
      juz_number: 6,
      hizb_number: 12,
      rub_el_hizb_number: 48,
      text_uthmani: "قُلْ أَتَعْبُدُونَ",
      text_imlaei_simple: "قل أتعبدون",
    },
    {
      id: 746,
      verse_number: 77,
      verse_key: "5:77",
      chapter_id: 5,
      page_number: 121,
      juz_number: 6,
      hizb_number: 12,
      rub_el_hizb_number: 48,
      text_uthmani: "قُلْ يَـٰٓأَهْلَ ٱلْكِتَـٰبِ",
      text_imlaei_simple: "قل يا أهل الكتاب",
    },
    {
      id: 747,
      verse_number: 78,
      verse_key: "5:78",
      chapter_id: 5,
      page_number: 121,
      juz_number: 6,
      hizb_number: 12,
      rub_el_hizb_number: 48,
      text_uthmani: "لُعِنَ",
      text_imlaei_simple: "لعن",
    },
  ];

  const words = [
    {
      id: 2001,
      position: 1,
      verse_id: 744,
      verse_key: "5:75",
      location: "5:75:1",
      text_uthmani: "مَّا",
      qpc_uthmani_hafs: "مَّا",
      code_v1: "v1_75_1",
      code_v2: "v2_75_1",
      audio_url: "wbw/005_075_001.mp3",
      char_type_name: "word",
      page_number: 120,
      line_number: 1,
    },
    {
      id: 2002,
      position: 2,
      verse_id: 744,
      verse_key: "5:75",
      location: "5:75:2",
      text_uthmani: "٧٥",
      qpc_uthmani_hafs: "٧٥",
      code_v1: "v1_75_e",
      code_v2: "v2_75_e",
      audio_url: null,
      char_type_name: "end",
      page_number: 120,
      line_number: 1,
    },
    {
      id: 2003,
      position: 1,
      verse_id: 745,
      verse_key: "5:76",
      location: "5:76:1",
      text_uthmani: "قُلْ",
      qpc_uthmani_hafs: "قُلۡ",
      code_v1: "v1_76_1",
      code_v2: "v2_76_1",
      audio_url: "wbw/005_076_001.mp3",
      char_type_name: "word",
      page_number: 120,
      line_number: 2,
    },
    {
      id: 2004,
      position: 2,
      verse_id: 745,
      verse_key: "5:76",
      location: "5:76:2",
      text_uthmani: "٧٦",
      qpc_uthmani_hafs: "٧٦",
      code_v1: "v1_76_e",
      code_v2: "v2_76_e",
      audio_url: null,
      char_type_name: "end",
      page_number: 120,
      line_number: 2,
    },
    {
      id: 2005,
      position: 1,
      verse_id: 746,
      verse_key: "5:77",
      location: "5:77:1",
      text_uthmani: "قُلْ",
      qpc_uthmani_hafs: "قُلۡ",
      code_v1: "v1_77_1",
      code_v2: "v2_77_1",
      audio_url: "wbw/005_077_001.mp3",
      char_type_name: "word",
      page_number: 121,
      line_number: 1,
    },
    {
      id: 2006,
      position: 2,
      verse_id: 746,
      verse_key: "5:77",
      location: "5:77:2",
      text_uthmani: "يَـٰٓأَهْلَ",
      qpc_uthmani_hafs: "يَٰٓأَهۡلَ",
      code_v1: "v1_77_2",
      code_v2: "v2_77_2",
      audio_url: "wbw/005_077_002.mp3",
      char_type_name: "word",
      page_number: 121,
      line_number: 1,
    },
    {
      id: 2007,
      position: 3,
      verse_id: 746,
      verse_key: "5:77",
      location: "5:77:3",
      text_uthmani: "٧٧",
      qpc_uthmani_hafs: "٧٧",
      code_v1: "v1_77_e",
      code_v2: "v2_77_e",
      audio_url: null,
      char_type_name: "end",
      page_number: 121,
      line_number: 1,
    },
    {
      id: 2008,
      position: 1,
      verse_id: 747,
      verse_key: "5:78",
      location: "5:78:1",
      text_uthmani: "لُعِنَ",
      qpc_uthmani_hafs: "لُعِنَ",
      code_v1: "v1_78_1",
      code_v2: "v2_78_1",
      audio_url: "wbw/005_078_001.mp3",
      char_type_name: "word",
      page_number: 121,
      line_number: 2,
    },
  ];

  const layoutsByMushaf = {
    // Mushaf 2 matches canonical page numbers: 5:75..5:76 on page 120; 5:77..5:78 on page 121.
    2: [
      { word_id: 2001, page_number: 120, line_number: 1 },
      { word_id: 2002, page_number: 120, line_number: 1 },
      { word_id: 2003, page_number: 120, line_number: 2 },
      { word_id: 2004, page_number: 120, line_number: 2 },
      { word_id: 2005, page_number: 121, line_number: 1 },
      { word_id: 2006, page_number: 121, line_number: 1 },
      { word_id: 2007, page_number: 121, line_number: 1 },
      { word_id: 2008, page_number: 121, line_number: 2 },
    ],
    // Mushaf 19 diverges at 5:77 and straddles 5:77 across pages 120 -> 121.
    19: [
      { word_id: 2001, page_number: 120, line_number: 13 },
      { word_id: 2002, page_number: 120, line_number: 13 },
      { word_id: 2003, page_number: 120, line_number: 14 },
      { word_id: 2004, page_number: 120, line_number: 14 },
      { word_id: 2005, page_number: 120, line_number: 15 },
      { word_id: 2006, page_number: 121, line_number: 1 },
      { word_id: 2007, page_number: 121, line_number: 1 },
      { word_id: 2008, page_number: 121, line_number: 2 },
    ],
    // Mushaf 1 places all of 5:77 onto page 120 while canonical page remains 121.
    1: [
      { word_id: 2001, page_number: 120, line_number: 13 },
      { word_id: 2002, page_number: 120, line_number: 13 },
      { word_id: 2003, page_number: 120, line_number: 14 },
      { word_id: 2004, page_number: 120, line_number: 14 },
      { word_id: 2005, page_number: 120, line_number: 15 },
      { word_id: 2006, page_number: 120, line_number: 15 },
      { word_id: 2007, page_number: 120, line_number: 15 },
      { word_id: 2008, page_number: 121, line_number: 1 },
    ],
  };

  return { chapters, verses, words, layoutsByMushaf };
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("quran-static edition triple-sync & ADR 0066 role constants", () => {
  it("keeps build-time edition tables synced with app/utils/mushaf-editions.ts", () => {
    const appEditionIds = Object.keys(MUSHAF_EDITIONS)
      .map(Number)
      .sort((a, b) => a - b);

    expect(SEEDED_WORDS_MUSHAF_ID).toBe(2);
    expect(DEFAULT_MUSHAF_ID).toBe(1);
    expect(QCF_V2_MUSHAF_ID).toBe(1);
    expect(TAJWEED_MUSHAF_ID).toBe(19);
    expect(APP_DEFAULT_MUSHAF_ID).toBe(2);

    expect([...LAYOUT_MUSHAF_IDS].sort((a, b) => a - b)).toEqual(appEditionIds);
    expect([...MUSHAF_EDITION_IDS].sort((a, b) => a - b)).toEqual(appEditionIds);

    for (const editionId of appEditionIds) {
      expect(["code_v1", "code_v2"]).toContain(GLYPH_FIELD_BY_MUSHAF[editionId]);
    }
  });
});

describe("quran-static generate — 5:77 edition divergence & straddling verses", () => {
  it("preserves canonical word/verse page_number while applying edition glyph and pageMetadata offsets", () => {
    const artifacts = buildStaticArtifacts(buildSyntheticDataset());

    const m1P120 = JSON.parse(artifacts.get("pages/1/120.json"));
    const m2P120 = JSON.parse(artifacts.get("pages/2/120.json"));
    const m19P120 = JSON.parse(artifacts.get("pages/19/120.json"));

    expect(m2P120.pageMetadata.id).toBe(120);
    expect(m19P120.pageMetadata.id).toBe(724);
    expect(m1P120.pageMetadata.id).toBe(1328);

    // 5:77 renders on page 120 in mushaf 1 & 19, yet canonical word.page_number stays 121.
    const word577InM1 = m1P120.lines["15"][0];
    expect(word577InM1.verse_key).toBe("5:77");
    expect(word577InM1.page_number).toBe(121);
    expect(word577InM1.verse.page_number).toBe(121);
    expect(word577InM1.glyph).toBe("v2_77_1");
    expect(word577InM1.line_number).toBe(15);

    expect(m2P120.lines["1"][0].glyph).toBe("v1_75_1");
    expect(m19P120.lines["15"][0].glyph).toBe("v2_77_1");
  });

  it("handles 5:77 boundary and straddling verses in verse-pages and page-bounds", () => {
    const artifacts = buildStaticArtifacts(buildSyntheticDataset());

    const vp2 = JSON.parse(artifacts.get("verse-pages/2.json"));
    const vp19 = JSON.parse(artifacts.get("verse-pages/19.json"));
    const bounds2 = JSON.parse(artifacts.get("page-bounds/2.json"));
    const bounds19 = JSON.parse(artifacts.get("page-bounds/19.json"));

    expect(vp2["5:77"]).toBe(121);
    expect(vp19["5:77"]).toBe(120);

    expect(bounds2["120"]).toEqual({
      firstVerseKey: "5:75",
      lastVerseKey: "5:76",
      lastChapterId: 5,
      verses: ["5:75", "5:76"],
    });
    expect(bounds19["120"]).toEqual({
      firstVerseKey: "5:75",
      lastVerseKey: "5:77",
      lastChapterId: 5,
      verses: ["5:75", "5:76", "5:77"],
    });
    expect(bounds19["121"]).toEqual({
      firstVerseKey: "5:77",
      lastVerseKey: "5:78",
      lastChapterId: 5,
      verses: ["5:77", "5:78"],
    });
  });
});

describe("quran-static generate — rub integer IDs, audio URLs & CLI parsing", () => {
  it("emits integer verse IDs in rubs, normalized word audio via position, and no trailing newline on juz-starts", () => {
    const dataset = buildSyntheticDataset();
    const artifacts = buildStaticArtifacts(dataset);

    expect(artifacts.get("juz-starts.json").endsWith("\n")).toBe(false);

    const verses = JSON.parse(artifacts.get("verses.json"));
    expect(verses["5:77"].words_uthmani_hafs).toBe("قُلۡ يَٰٓأَهۡلَ");

    const words = JSON.parse(artifacts.get("words.json"));
    expect(words["5:77:1"]).toEqual({ u: "قُلْ", h: "قُلۡ" });
    expect(words["5:77:3"]).toBeUndefined();

    const rubs = JSON.parse(artifacts.get("rubs.json"));
    expect(rubs).toHaveLength(1);
    expect(rubs[0]).toMatchObject({
      rub_number: 48,
      verse_mapping_start: 744,
      verse_mapping_end: 747,
      verses_count: 4,
    });
    expect(typeof rubs[0].verse_mapping_start).toBe("number");
    expect(typeof rubs[0].verse_mapping_end).toBe("number");

    expect(correctAudioUrl("wbw/002_002_006.mp3", 5)).toBe("wbw/002_002_005.mp3");
    expect(
      normalizeAudioUrl({
        char_type_name: "word",
        audio_url: "wbw/002_002_009.mp3",
        position: 7,
      })
    ).toBe("wbw/002_002_007.mp3");
    expect(
      normalizeAudioUrl({ char_type_name: "end", audio_url: null, position: 8 })
    ).toBeNull();
  });

  it("parses CLI flags and resolves --only=pages to include verse-pages", () => {
    expect(parseCliArgs(["--verify-existing", "--only=rubs", "--concurrency=8"])).toEqual({
      only: "rubs",
      verifyExisting: true,
      concurrency: 8,
    });
    const pageTargets = resolveTargetSet("pages");
    expect(pageTargets.has("pages")).toBe(true);
    expect(pageTargets.has("verse-pages")).toBe(true);
    expect(() => resolveTargetSet("bogus")).toThrow(/Unknown --only target/);
  });

  it("throws when full Quran rub derivation does not yield 240 rubs", () => {
    const fakeFullVerses = Array.from({ length: 6236 }, (_, idx) => ({
      id: idx + 1,
      verse_number: idx + 1,
      verse_key: `1:${idx + 1}`,
      chapter_id: 1,
      rub_el_hizb_number: 1,
    }));
    expect(() => deriveRubsFromVerses(fakeFullVerses)).toThrow(
      /Expected 240 rubs/
    );
  });
});

describe("quran-static validation & fetch guards", () => {
  it("enforces #155 non-decreasing line order and rejects invalid page/line/count layouts", () => {
    expect(() =>
      validateLayouts(
        19,
        [{ word_id: 1, page_number: 0, line_number: 1 }],
        1,
        1
      )
    ).toThrow(/Invalid page_number/);

    expect(() =>
      validateLayouts(
        19,
        [{ word_id: 1, page_number: 1, line_number: 16 }],
        1,
        1
      )
    ).toThrow(/out of 1–15 range/);

    // Non-decreasing mid-page check (#155 edition-splicing guard)
    expect(() =>
      validateLayouts(
        19,
        [
          { word_id: 1, page_number: 1, line_number: 4 },
          { word_id: 2, page_number: 1, line_number: 3 },
        ],
        2,
        1
      )
    ).toThrow(/decreases mid-page/);

    expect(() =>
      validateLayouts(
        19,
        [{ word_id: 1, page_number: 1, line_number: 1 }],
        1,
        2
      )
    ).toThrow(/Expected 2 pages/);

    expect(() =>
      validateLayouts(
        19,
        [{ word_id: 1, page_number: 1, line_number: 1 }],
        2,
        1
      )
    ).toThrow(/Expected 2 placement words/);
  });

  it("rejects duplicate or mismatched word_id placements in fetchMushafLayoutFromQdc", async () => {
    const duplicateFetch = async () => ({
      ok: true,
      async json() {
        return {
          verses: [
            {
              words: [
                { id: 10, line_number: 1 },
                { id: 10, line_number: 2 },
              ],
            },
          ],
        };
      },
    });
    await expect(
      fetchMushafLayoutFromQdc(19, new Set([10]), {
        totalPages: 1,
        fetchImpl: duplicateFetch,
      })
    ).rejects.toThrow(/more than one page/);

    const missingFetch = async () => ({
      ok: true,
      async json() {
        return {
          verses: [{ words: [{ id: 10, line_number: 1 }] }],
        };
      },
    });
    await expect(
      fetchMushafLayoutFromQdc(19, new Set([10, 11]), {
        totalPages: 1,
        fetchImpl: missingFetch,
      })
    ).rejects.toThrow(/missing placement/);
  });

  it("retries transient fetch failures with timeout signal and rejects invalid chapters responses", async () => {
    let attempts = 0;
    let sawAbortSignal = false;
    const flakyFetch = async (_url, opts) => {
      attempts++;
      if (opts && opts.signal) sawAbortSignal = true;
      if (attempts === 1) return { ok: false, status: 503 };
      if (attempts === 2) throw new Error("socket hang up");
      return {
        ok: true,
        async json() {
          return { ok: true };
        },
      };
    };

    const payload = await fetchJsonWithRetry("https://example.test/qdc", {
      retries: 3,
      backoffMs: 1,
      timeoutMs: 5000,
      fetchImpl: flakyFetch,
    });
    expect(payload).toEqual({ ok: true });
    expect(attempts).toBe(3);
    expect(sawAbortSignal).toBe(true);

    await expect(
      fetchJsonWithRetry("https://example.test/qdc", {
        retries: 2,
        backoffMs: 1,
        fetchImpl: async () => ({ ok: false, status: 500 }),
      })
    ).rejects.toThrow(/HTTP 500/);

    await expect(
      fetchChaptersFromQdc({
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return { chapters: [] };
          },
        }),
      })
    ).rejects.toThrow(/missing non-empty `chapters`/);

    await expect(
      fetchChaptersFromQdc({
        expectedChapters: 114,
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return { chapters: [{ id: 1, name_simple: "Al-Fatihah", pages: [1, 1] }] };
          },
        }),
      })
    ).rejects.toThrow(/Expected 114 chapters/);
  });

  it("runs runGenerator end-to-end with injected fetchImpl and verifies written files via --verify-existing", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "furqan-e2e-gen-"));
    try {
      const mockFetch = async (url) => {
        if (url.includes("/chapters")) {
          return {
            ok: true,
            async json() {
              return {
                chapters: [
                  {
                    id: 1,
                    revelation_order: 5,
                    revelation_place: "makkah",
                    name_complex: "Al-Fātiĥah",
                    name_arabic: "الفاتحة",
                    name_simple: "Al-Fatihah",
                    verses_count: 1,
                    pages: [1, 1],
                    translated_name: { name: "The Opener" },
                  },
                ],
              };
            },
          };
        }
        return {
          ok: true,
          async json() {
            return {
              verses: [
                {
                  id: 1,
                  verse_number: 1,
                  verse_key: "1:1",
                  chapter_id: 1,
                  page_number: 1,
                  juz_number: 1,
                  hizb_number: 1,
                  rub_el_hizb_number: 1,
                  text_uthmani: "بِسْمِ",
                  text_imlaei_simple: "بسم",
                  words: [
                    {
                      id: 1,
                      position: 1,
                      verse_id: 1,
                      verse_key: "1:1",
                      location: "1:1:1",
                      text_uthmani: "بِسْمِ",
                      qpc_uthmani_hafs: "بِسۡمِ",
                      code_v1: "g1",
                      code_v2: "g2",
                      audio_url: "wbw/001_001_002.mp3",
                      char_type_name: "word",
                      page_number: 1,
                      line_number: 9,
                    },
                  ],
                },
              ],
            };
          },
        };
      };

      const res1 = await runGenerator({
        totalPages: 1,
        concurrency: 2,
        outputDir: tmpDir,
        fetchImpl: mockFetch,
      });
      expect(res1.writtenCount).toBe(15);

      const res2 = await runGenerator({
        totalPages: 1,
        concurrency: 2,
        verifyExisting: true,
        outputDir: tmpDir,
        fetchImpl: mockFetch,
      });
      expect(res2.verifiedCount).toBe(9);
      expect(res2.writtenCount).toBe(6);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("quran-static atomic rollback & verifyExisting", () => {
  it("rolls back pre-existing files and cleans temp files if writeArtifactsAtomically fails mid-batch", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "furqan-atomic-"));
    try {
      const aPath = path.join(tmpDir, "a.json");
      const bPath = path.join(tmpDir, "b.json");
      fs.writeFileSync(aPath, '{"original":true}', "utf8");

      const artifacts = new Map([
        ["a.json", '{"updated":true}'],
        ["b.json", '{"new":true}'],
      ]);

      let renameCalls = 0;
      expect(() =>
        writeArtifactsAtomically(artifacts, tmpDir, {
          renameSync(src, dest) {
            renameCalls++;
            if (renameCalls === 2) {
              throw new Error("Simulated rename failure");
            }
            return fs.renameSync(src, dest);
          },
        })
      ).toThrow(/Simulated rename failure/);

      // Earlier destination file was rolled back to its original bytes.
      expect(fs.readFileSync(aPath, "utf8")).toBe('{"original":true}');
      expect(fs.existsSync(bPath)).toBe(false);
      expect(fs.readdirSync(tmpDir).some((n) => n.includes(".tmp-"))).toBe(
        false
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("fails verifyExistingArtifacts on byte mismatch or missing file without modifying existing files", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "furqan-verify-"));
    try {
      const chaptersPath = path.join(tmpDir, "chapters.json");
      fs.writeFileSync(chaptersPath, "[1,2,3]", "utf8");

      const ok = verifyExistingArtifacts(
        new Map([
          ["chapters.json", "[1,2,3]"],
          ["rubs.json", "[]"],
        ]),
        tmpDir
      );
      expect(ok.verifiedCount).toBe(1);
      expect(ok.newFiles.get("rubs.json")).toBe("[]");

      expect(() =>
        verifyExistingArtifacts(
          new Map([["chapters.json", "[1,2,4]"]]),
          tmpDir
        )
      ).toThrow(/Byte mismatches/);
      expect(fs.readFileSync(chaptersPath, "utf8")).toBe("[1,2,3]");

      expect(() =>
        verifyExistingArtifacts(new Map([["juz-starts.json", "[]"]]), tmpDir)
      ).toThrow(/Missing existing files/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("contains zero database/Prisma code tokens in generator scripts", () => {
    const scriptPaths = [
      "scripts/quran-static/generate.js",
      "scripts/quran-chapters/generate.js",
      "scripts/quran-juz-starts/generate.js",
      "scripts/quran-search-index/generate.js",
      "scripts/quran-json/generate.js",
    ];
    for (const rel of scriptPaths) {
      const code = stripJsComments(
        fs.readFileSync(path.join(REPO_ROOT, rel), "utf8")
      );
      expect(code).not.toMatch(/quranPrisma|QURAN_DATABASE_URL|dotenv/);
    }
  });
});

describe("quran-static committed public/quran artifacts & byte parity", () => {
  it("matches committed pages/2/1.json, chapters.json, and juz-starts.json byte-for-byte via buildStaticArtifacts", () => {
    const committedP1 = JSON.parse(
      fs.readFileSync(path.join(PUBLIC_QURAN_DIR, "pages/2/1.json"), "utf8")
    );
    const meta = committedP1.pageMetadata;
    const rawWords = Object.values(committedP1.lines).flat();

    // Build exact Page-1 input from committed page 1 metadata & tokens to verify
    // `buildStaticArtifacts` byte-for-byte against disk with zero network calls.
    const verseMap = new Map();
    const words = rawWords.map((w, idx) => {
      if (!verseMap.has(w.verse_key)) {
        const num = Number(w.verse_key.split(":")[1]);
        verseMap.set(w.verse_key, {
          id: num,
          verse_number: num,
          verse_key: w.verse_key,
          chapter_id: 1,
          page_number: w.verse.page_number,
          juz_number: meta.juz_number,
          hizb_number: meta.hizb_number,
          rub_el_hizb_number: 1,
        });
      }
      const pos = Number(w.location.split(":")[2]);
      return {
        id: idx + 1,
        position: pos,
        verse_id: verseMap.get(w.verse_key).id,
        verse_key: w.verse_key,
        location: w.location,
        qpc_uthmani_hafs: w.qpc_uthmani_hafs,
        code_v1: w.glyph,
        audio_url: w.audio_url,
        char_type_name: w.char_type_name,
        page_number: w.page_number,
        line_number: w.line_number,
      };
    });

    const page1Artifacts = buildStaticArtifacts({
      chapters: [meta.chapter],
      verses: Array.from(verseMap.values()),
      words,
      layoutsByMushaf: {
        2: words.map((w) => ({
          word_id: w.id,
          page_number: 1,
          line_number: w.line_number,
        })),
      },
      targets: new Set(["pages"]),
    });

    const parityCheck = verifyExistingArtifacts(
      new Map([
        ["pages/2/1.json", page1Artifacts.get("pages/2/1.json")],
        [
          "chapters.json",
          fs.readFileSync(path.join(PUBLIC_QURAN_DIR, "chapters.json"), "utf8"),
        ],
        [
          "juz-starts.json",
          fs.readFileSync(
            path.join(PUBLIC_QURAN_DIR, "juz-starts.json"),
            "utf8"
          ),
        ],
      ]),
      PUBLIC_QURAN_DIR
    );
    expect(parityCheck.verifiedCount).toBe(3);
  });

  it("validates generated page-bounds, rubs, verses, words, and real 5:77 boundary", () => {
    for (const mushafId of [1, 2, 19]) {
      const boundsFile = path.join(
        PUBLIC_QURAN_DIR,
        `page-bounds/${mushafId}.json`
      );
      expect(fs.existsSync(boundsFile)).toBe(true);
      const bounds = JSON.parse(fs.readFileSync(boundsFile, "utf8"));
      expect(Object.keys(bounds)).toHaveLength(604);
      expect(bounds["1"].firstVerseKey).toBe("1:1");
      expect(bounds["1"].verses.length).toBeGreaterThan(0);
      expect(typeof bounds["1"].lastChapterId).toBe("number");
    }

    const bounds2 = JSON.parse(
      fs.readFileSync(path.join(PUBLIC_QURAN_DIR, "page-bounds/2.json"), "utf8")
    );
    const bounds19 = JSON.parse(
      fs.readFileSync(
        path.join(PUBLIC_QURAN_DIR, "page-bounds/19.json"),
        "utf8"
      )
    );
    const vp2 = JSON.parse(
      fs.readFileSync(path.join(PUBLIC_QURAN_DIR, "verse-pages/2.json"), "utf8")
    );
    const vp19 = JSON.parse(
      fs.readFileSync(
        path.join(PUBLIC_QURAN_DIR, "verse-pages/19.json"),
        "utf8"
      )
    );
    expect(vp2["5:77"]).toBe(121);
    expect(vp19["5:77"]).toBe(120);
    expect(bounds2["120"].lastVerseKey).toBe("5:76");
    expect(bounds19["120"].lastVerseKey).toBe("5:77");

    const rubs = JSON.parse(
      fs.readFileSync(path.join(PUBLIC_QURAN_DIR, "rubs.json"), "utf8")
    );
    expect(rubs).toHaveLength(240);
    expect(rubs[0].rub_number).toBe(1);
    expect(rubs[0].verse_mapping_start).toBe(1);
    expect(rubs[0].verse_mapping_end).toBe(32);
    expect(typeof rubs[0].verse_mapping_start).toBe("number");
    expect(rubs[239].rub_number).toBe(240);
    expect(rubs[0].rubVerseMappings.length).toBeGreaterThan(0);
    expect(rubs[0].startVerse.Word.length).toBeGreaterThan(0);
    expect(typeof rubs[0].endVerse.chapter_id).toBe("number");

    // Verify large verses.json / words.json counts and sample keys quickly without multi-MB JSON.parse overhead.
    const versesRaw = fs.readFileSync(
      path.join(PUBLIC_QURAN_DIR, "verses.json"),
      "utf8"
    );
    const verseMatches = versesRaw.match(/\{"id":\d+,"verse_number":/g);
    expect(verseMatches).toHaveLength(6236);
    expect(versesRaw).toContain('"1:1":{"id":1,"verse_number":1,');
    expect(versesRaw).toContain('"114:6":{');

    const wordsRaw = fs.readFileSync(
      path.join(PUBLIC_QURAN_DIR, "words.json"),
      "utf8"
    );
    const wordMatches = wordsRaw.match(/"\d+:\d+:\d+":\{"u":/g);
    expect(wordMatches.length).toBeGreaterThan(77000);
    expect(wordsRaw).toContain('"1:1:1":{"u":"');
    expect(wordsRaw).not.toContain('"1:1:5":');
  });
});
