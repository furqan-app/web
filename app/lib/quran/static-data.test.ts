import { describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import {
  getStaticPageBounds,
  getStaticPageWords,
  getStaticRubs,
  getStaticVersePages,
  getStaticVerses,
  RUBS_PER_HIZB,
  RUBS_PER_JUZ,
  TOTAL_RUBS,
} from "@/app/lib/quran/static-data";
import { getPageWords } from "@/app/hooks/get-page-words";
import { getRubs } from "@/app/hooks/get-rubs";
import { GET as getVerseText } from "@/app/api/quran/verses/[verseKey]/route";
import { GET as getPageBounds } from "@/app/api/quran/pages/[pageId]/bounds/route";
import { GET as getJuzBounds } from "@/app/api/quran/juz/[juzNumber]/bounds/route";
import { GET as getStopPoint } from "@/app/api/quran/verses/[verseKey]/stop-point/route";

describe("static-data & getPageWords", () => {
  it("loads static page JSON directly per edition with valid glyph and line_number", async () => {
    const p1m2 = await getPageWords(1, 2);
    expect(p1m2.pageMetadata.mushaf_id).toBe(2);
    expect(p1m2.pageMetadata.page_number).toBe(1);
    const p1Words = Object.values(p1m2.lines).flat();
    expect(p1Words.length).toBeGreaterThan(0);
    for (const word of p1Words) {
      expect(typeof word.glyph).toBe("string");
      expect(word.glyph.length).toBeGreaterThan(0);
      expect(word.line_number).toBeGreaterThanOrEqual(1);
      expect(word.line_number).toBeLessThanOrEqual(15);
    }

    const p120m19 = await getPageWords(120, 19);
    expect(p120m19.pageMetadata.mushaf_id).toBe(19);
    expect(p120m19.pageMetadata.page_number).toBe(120);
    const allVersesOnM19P120 = Object.values(p120m19.lines)
      .flat()
      .map((w) => w.verse_key);
    expect(allVersesOnM19P120).toContain("5:77");
  });

  it("rejects unregistered editions and out-of-range page numbers", async () => {
    await expect(getPageWords(1, 999)).rejects.toThrow(/not registered/);
    await expect(getPageWords(0, 2)).rejects.toThrow(/invalid page 0/);
    await expect(getPageWords(605, 2)).rejects.toThrow(/invalid page 605/);
  });

  it("returns all 240 sorted rubs with rubVerseMappings from getRubs", async () => {
    const rubs = await getRubs();
    expect(rubs).toHaveLength(TOTAL_RUBS);
    expect(rubs[0].startVerse.verse_key).toBe("1:1");
    expect(rubs[239].endVerse.page_number).toBe(604);

    for (let i = 0; i < rubs.length; i++) {
      expect(rubs[i].rub_number).toBe(i + 1);
      expect(rubs[i].rubVerseMappings.length).toBeGreaterThan(0);
    }
  });

  it("caches aggregate loaders and rejects unknown editions on static helpers", async () => {
    await expect(getStaticPageBounds(999)).rejects.toThrow(/not registered/);
    await expect(getStaticVersePages(999)).rejects.toThrow(/not registered/);
    const [b1, b2] = await Promise.all([
      getStaticPageBounds(2),
      getStaticPageBounds(2),
    ]);
    expect(b1).toBe(b2);
  });

  it("resets cached loader promise on read/schema error so subsequent reads recover", async () => {
    const spy = vi.spyOn(fs, "readFile");
    try {
      spy.mockRejectedValueOnce(new Error("ENOENT"));
      await expect(getStaticPageBounds(1)).rejects.toThrow(
        /npm run generate:quran/,
      );

      // Next call must NOT return the rejected cached promise.
      const recovered = await getStaticPageBounds(1);
      expect(Object.keys(recovered)).toHaveLength(604);

      spy.mockResolvedValueOnce(JSON.stringify({ lines: {}, pageMetadata: { mushaf_id: 2, page_number: 999 } }));
      await expect(getStaticPageWords(2, 2)).rejects.toThrow(
        /does not match expected schema.*npm run generate:quran/,
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe("GET /api/quran/verses/[verseKey]", () => {
  it("returns normalized verse text with words_uthmani_hafs and plain text stripping ۞", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/quran/verses/1:1");
    const res1 = await getVerseText(req1, { params: { verseKey: "1:1" } });
    const body1 = await res1.json();
    expect(body1.code).toBe(200);
    expect(body1.data.verse_key).toBe("1:1");
    expect(body1.data.text_uthmani).toBeTruthy();
    expect(body1.data.text_plain).toBeTruthy();

    // Verse 2:142 starts with rub marker ۞ in raw text_uthmani.
    const req2 = new NextRequest("http://localhost:3000/api/quran/verses/2:142");
    const res2 = await getVerseText(req2, { params: { verseKey: "2:142" } });
    const body2 = await res2.json();
    expect(body2.code).toBe(200);
    expect(body2.data.text_uthmani).toContain("۞");
    expect(body2.data.text_plain).not.toContain("۞");

    // Underscore separator normalizes to canonical colon key.
    const reqAlt = new NextRequest("http://localhost:3000/api/quran/verses/1_1");
    const resAlt = await getVerseText(reqAlt, { params: { verseKey: "1_1" } });
    const bodyAlt = await resAlt.json();
    expect(bodyAlt.code).toBe(200);
    expect(bodyAlt.data.verse_key).toBe("1:1");
  });

  it("returns 422 on invalid format and 404 on unknown verse", async () => {
    const badReq = new NextRequest("http://localhost:3000/api/quran/verses/bad");
    const badRes = await getVerseText(badReq, { params: { verseKey: "bad" } });
    expect((await badRes.json()).code).toBe(422);

    const missingReq = new NextRequest(
      "http://localhost:3000/api/quran/verses/999:1",
    );
    const missingRes = await getVerseText(missingReq, {
      params: { verseKey: "999:1" },
    });
    expect((await missingRes.json()).code).toBe(404);
  });
});

describe("GET /api/quran/pages/[pageId]/bounds", () => {
  it("resolves edition-specific page bounds without leaking the internal verses list", async () => {
    const req2 = new NextRequest(
      "http://localhost:3000/api/quran/pages/120/bounds?mushaf=2",
    );
    const body2 = await (
      await getPageBounds(req2, { params: { pageId: "120" } })
    ).json();
    expect(body2.code).toBe(200);
    expect(body2.data).toEqual({
      firstVerseKey: "5:71",
      lastVerseKey: "5:76",
      lastChapterId: 5,
    });
    expect("verses" in body2.data).toBe(false);

    const req19 = new NextRequest(
      "http://localhost:3000/api/quran/pages/120/bounds?mushaf=19",
    );
    const body19 = await (
      await getPageBounds(req19, { params: { pageId: "120" } })
    ).json();
    expect(body19.code).toBe(200);
    expect(body19.data).toEqual({
      firstVerseKey: "5:71",
      lastVerseKey: "5:77",
      lastChapterId: 5,
    });

    // Unregistered edition falls back to DEFAULT_MUSHAF_ID (mushaf 2).
    const reqFallback = new NextRequest(
      "http://localhost:3000/api/quran/pages/120/bounds?mushaf=999",
    );
    const bodyFallback = await (
      await getPageBounds(reqFallback, { params: { pageId: "120" } })
    ).json();
    expect(bodyFallback.data).toEqual(body2.data);
  });

  it("returns 422 on non-numeric pageId and 404 on out-of-range page", async () => {
    const badReq = new NextRequest(
      "http://localhost:3000/api/quran/pages/abc/bounds",
    );
    expect(
      (await (await getPageBounds(badReq, { params: { pageId: "abc" } })).json())
        .code,
    ).toBe(422);

    const missingReq = new NextRequest(
      "http://localhost:3000/api/quran/pages/605/bounds",
    );
    expect(
      (
        await (
          await getPageBounds(missingReq, { params: { pageId: "605" } })
        ).json()
      ).code,
    ).toBe(404);
  });
});

describe("GET /api/quran/juz/[juzNumber]/bounds", () => {
  it("resolves juz 1 and juz 30 bounds and chapter lists", async () => {
    const req1 = new NextRequest(
      "http://localhost:3000/api/quran/juz/1/bounds",
    );
    const body1 = await (
      await getJuzBounds(req1, { params: { juzNumber: "1" } })
    ).json();
    expect(body1.code).toBe(200);
    expect(body1.data).toEqual({
      firstVerseKey: "1:1",
      lastVerseKey: "2:141",
      lastChapterId: 2,
      chapterIds: [1, 2],
    });

    const req30 = new NextRequest(
      "http://localhost:3000/api/quran/juz/30/bounds",
    );
    const body30 = await (
      await getJuzBounds(req30, { params: { juzNumber: "30" } })
    ).json();
    expect(body30.code).toBe(200);
    expect(body30.data.firstVerseKey).toBe("78:1");
    expect(body30.data.lastVerseKey).toBe("114:6");
    expect(body30.data.lastChapterId).toBe(114);
    expect(body30.data.chapterIds).toHaveLength(37);
  });

  it("returns 422 on invalid or out-of-range juz numbers", async () => {
    for (const bad of ["0", "31", "1foo", "-1"]) {
      const req = new NextRequest(
        `http://localhost:3000/api/quran/juz/${bad}/bounds`,
      );
      const body = await (
        await getJuzBounds(req, { params: { juzNumber: bad } })
      ).json();
      expect(body.code).toBe(422);
    }
  });
});

describe("GET /api/quran/verses/[verseKey]/stop-point", () => {
  it("resolves edition-aware page stops and all text-division scopes (rub-first, rub, hizb, juz)", async () => {
    const reqP2 = new NextRequest(
      "http://localhost:3000/api/quran/verses/5:77/stop-point?scope=page&mushaf=2",
    );
    expect(
      (await (await getStopPoint(reqP2, { params: { verseKey: "5:77" } })).json())
        .data,
    ).toEqual({ verseKey: "5:82", chapterId: 5 });

    const reqP19 = new NextRequest(
      "http://localhost:3000/api/quran/verses/5:77/stop-point?scope=page&mushaf=19",
    );
    expect(
      (await (await getStopPoint(reqP19, { params: { verseKey: "5:77" } })).json())
        .data,
    ).toEqual({ verseKey: "5:77", chapterId: 5 });

    const reqRubFirst = new NextRequest(
      "http://localhost:3000/api/quran/verses/2:142/stop-point?scope=rub-first",
    );
    expect(
      (
        await (
          await getStopPoint(reqRubFirst, { params: { verseKey: "2:142" } })
        ).json()
      ).data,
    ).toEqual({ verseKey: "2:142", chapterId: 2 });

    const reqRub = new NextRequest(
      "http://localhost:3000/api/quran/verses/2:142/stop-point?scope=rub",
    );
    expect(
      (
        await (
          await getStopPoint(reqRub, { params: { verseKey: "2:142" } })
        ).json()
      ).data,
    ).toEqual({ verseKey: "2:157", chapterId: 2 });

    const rubs = await getStaticRubs();
    const expectedHizb3End = rubs[3 * RUBS_PER_HIZB - 1].endVerse;
    const reqHizb = new NextRequest(
      "http://localhost:3000/api/quran/verses/2:142/stop-point?scope=hizb",
    );
    const bodyHizb = await (
      await getStopPoint(reqHizb, { params: { verseKey: "2:142" } })
    ).json();
    expect(bodyHizb.code).toBe(200);
    expect(bodyHizb.data).toEqual({
      verseKey: expectedHizb3End.verse_key,
      chapterId: expectedHizb3End.chapter_id,
    });

    const expectedJuz2End = rubs[2 * RUBS_PER_JUZ - 1].endVerse;
    const reqJuz = new NextRequest(
      "http://localhost:3000/api/quran/verses/2:142/stop-point?scope=juz",
    );
    const bodyJuz = await (
      await getStopPoint(reqJuz, { params: { verseKey: "2:142" } })
    ).json();
    expect(bodyJuz.code).toBe(200);
    expect(bodyJuz.data).toEqual({
      verseKey: expectedJuz2End.verse_key,
      chapterId: expectedJuz2End.chapter_id,
    });
  });

  it("matches exact max-id ends across all 60 hizbs and 30 juzs in verses.json", async () => {
    const [versesMap, rubs] = await Promise.all([
      getStaticVerses(),
      getStaticRubs(),
    ]);

    const hizbLast = new Map<number, { id: number; key: string; chapterId: number }>();
    const juzLast = new Map<number, { id: number; key: string; chapterId: number }>();

    for (const [key, v] of Object.entries(versesMap)) {
      const prevH = hizbLast.get(v.hizb_number);
      if (!prevH || v.id > prevH.id) {
        hizbLast.set(v.hizb_number, {
          id: v.id,
          key,
          chapterId: v.chapter_id,
        });
      }
      const prevJ = juzLast.get(v.juz_number);
      if (!prevJ || v.id > prevJ.id) {
        juzLast.set(v.juz_number, {
          id: v.id,
          key,
          chapterId: v.chapter_id,
        });
      }
    }

    expect(hizbLast.size).toBe(60);
    expect(juzLast.size).toBe(30);

    for (let hizb = 1; hizb <= 60; hizb++) {
      const expected = hizbLast.get(hizb)!;
      const rub = rubs[hizb * RUBS_PER_HIZB - 1];
      expect(rub.endVerse.verse_key).toBe(expected.key);
      expect(rub.endVerse.chapter_id).toBe(expected.chapterId);
    }

    for (let juz = 1; juz <= 30; juz++) {
      const expected = juzLast.get(juz)!;
      const rub = rubs[juz * RUBS_PER_JUZ - 1];
      expect(rub.endVerse.verse_key).toBe(expected.key);
      expect(rub.endVerse.chapter_id).toBe(expected.chapterId);
    }
  });

  it("returns 422 on invalid scope and 404 on unknown verse", async () => {
    const badScope = new NextRequest(
      "http://localhost:3000/api/quran/verses/1:1/stop-point?scope=unknown",
    );
    expect(
      (
        await (
          await getStopPoint(badScope, { params: { verseKey: "1:1" } })
        ).json()
      ).code,
    ).toBe(422);

    const missingVerse = new NextRequest(
      "http://localhost:3000/api/quran/verses/999:1/stop-point?scope=rub",
    );
    expect(
      (
        await (
          await getStopPoint(missingVerse, { params: { verseKey: "999:1" } })
        ).json()
      ).code,
    ).toBe(404);
  });
});
