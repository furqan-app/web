import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  resolveCustomPlanEnrollment,
  resolveCustomPlanEdit,
  type CreateCustomPlanBody,
  type PatchCustomPlanBody,
} from "./validate-custom-definition";
import { quranPrisma } from "@/app/utils/db";

vi.mock("@/app/utils/db", () => {
  return {
    quranPrisma: {
      verse: {
        aggregate: vi.fn(),
      },
      pageMetadata: {
        aggregate: vi.fn(),
      },
    },
    appPrisma: {},
  };
});

describe("validate-custom-definition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveCustomPlanEnrollment - Range Resolution", () => {
    it("1. resolves single surah range to page bounds (Al-Kahf: 18..18 -> 293..304)", async () => {
      vi.mocked(quranPrisma.verse.aggregate).mockResolvedValueOnce({
        _min: { page_number: 293 },
        _max: { page_number: 304 },
      } as unknown as Awaited<ReturnType<typeof quranPrisma.verse.aggregate>>);

      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "حفظ سورة الكهف",
        activity: "read",
        range: { mode: "surah", startSurah: 18 },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.name).toBe("حفظ سورة الكهف");
      expect(res.definition.unit).toBe("page");
      expect(res.definition.rangeStart).toBe(293);
      expect(res.definition.rangeEnd).toBe(304);
      expect(res.params.trackUnits).toEqual({ custom: "page" });
    });

    it("2. resolves multi-surah span (Al-Ikhlas to An-Nas: 112..114 -> 604..604)", async () => {
      vi.mocked(quranPrisma.verse.aggregate).mockResolvedValueOnce({
        _min: { page_number: 604 },
        _max: { page_number: 604 },
      } as unknown as Awaited<ReturnType<typeof quranPrisma.verse.aggregate>>);

      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "قراءة المعوذات",
        activity: "read",
        range: { mode: "surah", startSurah: 112, endSurah: 114 },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.unit).toBe("page");
      expect(res.definition.rangeStart).toBe(604);
      expect(res.definition.rangeEnd).toBe(604);
    });

    it("3. resolves juz range (Juz 30 -> 582..604)", async () => {
      vi.mocked(quranPrisma.pageMetadata.aggregate).mockResolvedValue({
        _min: { page_number: 582 },
        _max: { page_number: 604 },
      } as unknown as Awaited<ReturnType<typeof quranPrisma.pageMetadata.aggregate>>);

      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "حفظ جزء عم",
        activity: "memorize",
        range: { mode: "juz", startJuz: 30 },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.unit).toBe("page");
      expect(res.definition.rangeStart).toBe(582);
      expect(res.definition.rangeEnd).toBe(604);
    });

    it("4. resolves page range (pages 1..20 -> 1..20)", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "أول عشرين صفحة",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 20 },
        cadence: { type: "pace", amount: 5 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.unit).toBe("page");
      expect(res.definition.rangeStart).toBe(1);
      expect(res.definition.rangeEnd).toBe(20);
    });

    it("5. resolves verse range via verse keys ('2:255'..'2:257' -> 262..264)", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "آية الكرسي وما بعدها",
        activity: "memorize",
        range: { mode: "verse", startVerse: "2:255", endVerse: "2:257" },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.unit).toBe("verse");
      expect(res.definition.rangeStart).toBe(262);
      expect(res.definition.rangeEnd).toBe(264);
      expect(res.params.trackUnits).toEqual({ custom: "verse" });
    });

    it("6. resolves verse range via raw ordinals (1..7 -> 1..7)", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "الفاتحة بالأرقام",
        activity: "review",
        range: { mode: "verse", startVerse: 1, endVerse: 7 },
        cadence: { type: "pace", amount: 7 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.unit).toBe("verse");
      expect(res.definition.rangeStart).toBe(1);
      expect(res.definition.rangeEnd).toBe(7);
    });

    it("rejects surah range whose resolved page exceeds 604", async () => {
      vi.mocked(quranPrisma.verse.aggregate).mockResolvedValueOnce({
        _min: { page_number: 1 },
        _max: { page_number: 605 },
      } as unknown as Awaited<ReturnType<typeof quranPrisma.verse.aggregate>>);

      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Overflow Surah",
        activity: "read",
        range: { mode: "surah", startSurah: 1, endSurah: 114 },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Resolved range is outside mushaf bounds");
      }
    });
  });

  describe("resolveCustomPlanEnrollment - Cadence Resolution", () => {
    it("7. resolves daily pace (amount: 4 -> unitsPerDay: 4, endDate omitted)", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Daily Pace",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 604 },
        cadence: { type: "pace", amount: 4 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.cadence).toEqual({ type: "pace", unitsPerDay: 4 });
      expect(res.params.endDate).toBeUndefined();
    });

    it("8. resolves weekly pace on page unit with fractional pace preserved (Decision #1)", async () => {
      const bodyWhole: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Weekly 14",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 604 },
        cadence: { type: "pace", period: "week", amount: 14 },
      };

      const resWhole = await resolveCustomPlanEnrollment(bodyWhole);
      expect("error" in resWhole).toBe(false);
      if ("error" in resWhole) return;
      expect(resWhole.definition.cadence).toEqual({ type: "pace", unitsPerDay: 2 });

      // Non-multiple of 7: fractional pace preserved (10 / 7)
      const bodyFrac: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Weekly 10",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 604 },
        cadence: { type: "pace", period: "week", amount: 10 },
      };

      const resFrac = await resolveCustomPlanEnrollment(bodyFrac);
      expect("error" in resFrac).toBe(false);
      if ("error" in resFrac) return;
      if (resFrac.definition.cadence.type === "pace") {
        expect(resFrac.definition.cadence.unitsPerDay).toBeCloseTo(10 / 7, 5);
      }
    });

    it("9. resolves deadline cadence with repeat count K (endDate in params, repetitions in definition)", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Review Before Exam",
        activity: "review",
        range: { mode: "page", startPage: 582, endPage: 604 },
        cadence: { type: "deadline", endDate: "2026-10-15", repetitions: 3 },
        start_date: "2026-09-09",
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition.cadence).toEqual({
        type: "deadline",
        endDate: "2026-10-15",
        repetitions: 3,
      });
      expect(res.params.endDate).toBe("2026-10-15");
    });

    it("rejects repetitions > 100 in deadline cadence", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Excess Repetitions",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "deadline", endDate: "2026-10-01", repetitions: 101 },
        start_date: "2026-09-09",
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("cadence.repetitions must be between 1 and 100");
      }
    });

    it("rejects unexpected fields in cadence", async () => {
      const body = {
        template_key: "custom",
        name: "Extra Cadence Field",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "pace", amount: 1, extraField: "bad" },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Unexpected field in cadence");
      }
    });
  });

  describe("resolveCustomPlanEnrollment - Rejection Cases", () => {
    it("10. rejects memorize with repetitions > 1 (C2 Contract #3)", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Memorize Repeat",
        activity: "memorize",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "deadline", endDate: "2026-10-01", repetitions: 2 },
        start_date: "2026-09-09",
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Memorize plans do not support multiple repetitions");
      }
    });

    it("11. rejects verse range with weekly pace", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Weekly Verses",
        activity: "read",
        range: { mode: "verse", startVerse: 1, endVerse: 50 },
        cadence: { type: "pace", period: "week", amount: 10 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toContain("Weekly pace is not supported for verse-level wirds");
      }
    });

    it("12. rejects mixed range modes", async () => {
      const body: Record<string, unknown> = {
        template_key: "custom",
        name: "Mixed",
        activity: "read",
        range: { mode: "surah", startSurah: 1, startPage: 10 },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Cannot mix range modes");
      }
    });

    it("13. rejects inverted ranges (start > end)", async () => {
      const bodySurah: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Inverted Surah",
        activity: "read",
        range: { mode: "surah", startSurah: 20, endSurah: 10 },
        cadence: { type: "pace", amount: 1 },
      };
      const resSurah = await resolveCustomPlanEnrollment(bodySurah);
      expect("error" in resSurah).toBe(true);

      const bodyPage: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Inverted Page",
        activity: "read",
        range: { mode: "page", startPage: 50, endPage: 40 },
        cadence: { type: "pace", amount: 1 },
      };
      const resPage = await resolveCustomPlanEnrollment(bodyPage);
      expect("error" in resPage).toBe(true);

      const bodyVerse: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Inverted Verse",
        activity: "read",
        range: { mode: "verse", startVerse: 100, endVerse: 50 },
        cadence: { type: "pace", amount: 1 },
      };
      const resVerse = await resolveCustomPlanEnrollment(bodyVerse);
      expect("error" in resVerse).toBe(true);
    });

    it("14. rejects out-of-bounds parameters", async () => {
      const res1 = await resolveCustomPlanEnrollment({
        template_key: "custom",
        name: "Bad Surah",
        activity: "read",
        range: { mode: "surah", startSurah: 115 },
        cadence: { type: "pace", amount: 1 },
      });
      expect("error" in res1).toBe(true);

      const res2 = await resolveCustomPlanEnrollment({
        template_key: "custom",
        name: "Bad Juz",
        activity: "read",
        range: { mode: "juz", startJuz: 31 },
        cadence: { type: "pace", amount: 1 },
      });
      expect("error" in res2).toBe(true);

      const res3 = await resolveCustomPlanEnrollment({
        template_key: "custom",
        name: "Bad Page",
        activity: "read",
        range: { mode: "page", startPage: 605 },
        cadence: { type: "pace", amount: 1 },
      });
      expect("error" in res3).toBe(true);

      const res4 = await resolveCustomPlanEnrollment({
        template_key: "custom",
        name: "Bad Verse",
        activity: "read",
        range: { mode: "verse", startVerse: 6237 },
        cadence: { type: "pace", amount: 1 },
      });
      expect("error" in res4).toBe(true);
    });

    it("15. rejects deadline in the past", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Past Deadline",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "deadline", endDate: "2026-09-01" },
        start_date: "2026-09-09",
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("endDate must be on or after start date");
      }
    });

    it("16. rejects invalid activity name", async () => {
      const body: Record<string, unknown> = {
        template_key: "custom",
        name: "Invalid Activity",
        activity: "chant",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "pace", amount: 1 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Invalid activity");
      }
    });

    it("17. rejects invalid name length", async () => {
      const resEmpty = await resolveCustomPlanEnrollment({
        template_key: "custom",
        name: "   ",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "pace", amount: 1 },
      });
      expect("error" in resEmpty).toBe(true);

      const resLong = await resolveCustomPlanEnrollment({
        template_key: "custom",
        name: "A".repeat(101),
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "pace", amount: 1 },
      });
      expect("error" in resLong).toBe(true);
    });

    it("rejects non-integer daily pace", async () => {
      const body: CreateCustomPlanBody = {
        template_key: "custom",
        name: "Float daily",
        activity: "read",
        range: { mode: "page", startPage: 1, endPage: 10 },
        cadence: { type: "pace", period: "day", amount: 1.5 },
      };

      const res = await resolveCustomPlanEnrollment(body);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Daily pace must be an integer");
      }
    });
  });

  describe("resolveCustomPlanEdit (PATCH)", () => {
    const existingPlan = {
      template_key: "custom",
      name: "Old Name",
      definition: {
        activity: "read" as const,
        unit: "page" as const,
        rangeStart: 1,
        rangeEnd: 10,
        cadence: { type: "pace" as const, unitsPerDay: 2 },
      },
      params: { trackUnits: { custom: "page" } },
      start_date: new Date("2026-09-01T00:00:00Z"),
    };

    it("18. adjusts cadence on active plan (switching pace to deadline)", async () => {
      const body: PatchCustomPlanBody = {
        name: "Updated Name",
        cadence: { type: "deadline", endDate: "2026-12-31", repetitions: 2 },
      };

      const res = await resolveCustomPlanEdit(body, existingPlan, 5);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.name).toBe("Updated Name");
      expect(res.definition?.cadence).toEqual({
        type: "deadline",
        endDate: "2026-12-31",
        repetitions: 2,
      });
      expect(res.params?.endDate).toBe("2026-12-31");
    });

    it("switching from deadline to pace removes params.endDate", async () => {
      const existingDeadlinePlan = {
        template_key: "custom",
        name: "Deadline Plan",
        definition: {
          activity: "read" as const,
          unit: "page" as const,
          rangeStart: 1,
          rangeEnd: 10,
          cadence: { type: "deadline" as const, endDate: "2026-12-31" },
        },
        params: { trackUnits: { custom: "page" as const }, endDate: "2026-12-31" },
        start_date: new Date("2026-09-01T00:00:00Z"),
      };

      const body: PatchCustomPlanBody = {
        cadence: { type: "pace", amount: 5 },
      };

      const res = await resolveCustomPlanEdit(body, existingDeadlinePlan, 0);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition?.cadence).toEqual({ type: "pace", unitsPerDay: 5 });
      expect(res.params?.endDate).toBeUndefined();
    });

    it("rejects PATCH with whitespace-only name", async () => {
      const body: PatchCustomPlanBody = {
        name: "    ",
      };

      const res = await resolveCustomPlanEdit(body, existingPlan, 0);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("name must be between 1 and 100 characters");
      }
    });

    it("pure status update does not return definition or params", async () => {
      const corruptDefPlan = {
        template_key: "custom",
        name: "Corrupt Plan",
        definition: null,
        params: {},
        start_date: new Date("2026-09-01T00:00:00Z"),
      };

      const body: PatchCustomPlanBody = {
        status: "paused",
      };

      const res = await resolveCustomPlanEdit(body, corruptDefPlan, 5);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.status).toBe("paused");
      expect(res.definition).toBeUndefined();
      expect(res.params).toBeUndefined();
    });

    it("19. rejects range edit after progress has been logged (progressCount > 0)", async () => {
      const body: PatchCustomPlanBody = {
        range: { mode: "page", startPage: 50, endPage: 60 },
      };

      const res = await resolveCustomPlanEdit(body, existingPlan, 1);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toContain("Cannot change target range after progress has been logged");
      }
    });

    it("20. allows range edit when no progress has been logged (progressCount === 0)", async () => {
      const body: PatchCustomPlanBody = {
        range: { mode: "page", startPage: 50, endPage: 60 },
      };

      const res = await resolveCustomPlanEdit(body, existingPlan, 0);
      expect("error" in res).toBe(false);
      if ("error" in res) return;

      expect(res.definition?.rangeStart).toBe(50);
      expect(res.definition?.rangeEnd).toBe(60);
    });

    it("21. rejects attempted unit change in PATCH", async () => {
      // existingPlan is unit: "page"; trying to change to mode: "verse"
      const body: PatchCustomPlanBody = {
        range: { mode: "verse", startVerse: 1, endVerse: 10 },
      };

      const res = await resolveCustomPlanEdit(body, existingPlan, 0);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("Track unit cannot change after enrollment");
      }
    });

    it("22. rejects attempted activity change in PATCH", async () => {
      const body: Record<string, unknown> = {
        activity: "memorize",
      };

      const res = await resolveCustomPlanEdit(body, existingPlan, 0);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error).toBe("activity cannot change after enrollment");
      }
    });
  });
});
