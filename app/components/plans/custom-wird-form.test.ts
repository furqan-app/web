import { describe, expect, it } from "vitest";
import {
  buildCustomCreateBody,
  buildCustomPatchBody,
  type CustomWirdFormState,
} from "@/app/lib/plans/custom-wird-form-helpers";

describe("Custom Wird Form State Mapping & Invariants (CustomWirdForm)", () => {
  const baseState: CustomWirdFormState = {
    name: "ورد الفاتحة",
    activity: "read",
    rangeMode: "mushaf",
    startSurah: 1,
    endSurah: 1,
    startJuz: 1,
    endJuz: 30,
    startPage: 1,
    endPage: 604,
    startVerse: { surah: 1, ayah: 1 },
    endVerse: { surah: 1, ayah: 7 },
    cadenceType: "pace",
    pacePeriod: "day",
    paceAmount: 5,
    deadlineEndDate: "2026-10-09",
    repetitions: 1,
  };

  describe("Create Request Body Serialization", () => {
    it("serializes mushaf mode into { mode: 'page', startPage: 1, endPage: 604 }", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        rangeMode: "mushaf",
      });

      expect(body.template_key).toBe("custom");
      expect(body.name).toBe("ورد الفاتحة");
      expect(body.activity).toBe("read");
      expect(body.range).toEqual({
        mode: "page",
        startPage: 1,
        endPage: 604,
      });
      expect(body.cadence).toEqual({
        type: "pace",
        period: "day",
        amount: 5,
      });
    });

    it("serializes surah mode into startSurah and endSurah", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        rangeMode: "surah",
        startSurah: 18,
        endSurah: 20,
      });

      expect(body.range).toEqual({
        mode: "surah",
        startSurah: 18,
        endSurah: 20,
      });
    });

    it("serializes juz mode into startJuz and endJuz", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        rangeMode: "juz",
        startJuz: 1,
        endJuz: 5,
      });

      expect(body.range).toEqual({
        mode: "juz",
        startJuz: 1,
        endJuz: 5,
      });
    });

    it("serializes page mode into startPage and endPage", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        rangeMode: "page",
        startPage: 10,
        endPage: 25,
      });

      expect(body.range).toEqual({
        mode: "page",
        startPage: 10,
        endPage: 25,
      });
    });

    it("serializes verse mode into 'surah:ayah' strings", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        rangeMode: "verse",
        startVerse: { surah: 2, ayah: 255 },
        endVerse: { surah: 2, ayah: 257 },
      });

      expect(body.range).toEqual({
        mode: "verse",
        startVerse: "2:255",
        endVerse: "2:257",
      });
    });

    it("serializes deadline cadence with repetitions K > 1 for reading", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        cadenceType: "deadline",
        deadlineEndDate: "2026-11-01",
        repetitions: 3,
        activity: "read",
      });

      expect(body.cadence).toEqual({
        type: "deadline",
        endDate: "2026-11-01",
        repetitions: 3,
      });
    });

    it("omits repetitions from deadline payload when activity === 'memorize'", () => {
      const body = buildCustomCreateBody({
        ...baseState,
        cadenceType: "deadline",
        deadlineEndDate: "2026-11-01",
        repetitions: 5, // user had repetitions set
        activity: "memorize",
      });

      expect(body.cadence).toEqual({
        type: "deadline",
        endDate: "2026-11-01",
      });
      expect((body.cadence as { repetitions?: number }).repetitions).toBeUndefined();
    });
  });

  describe("Patch Request Body Serialization & Range Freeze Invariants", () => {
    it("omits range in PATCH body when hasProgress is true", () => {
      const patchBody = buildCustomPatchBody(
        {
          ...baseState,
          name: "Updated Name",
          rangeMode: "page",
          startPage: 100,
          endPage: 150,
          paceAmount: 10,
        },
        true // hasProgress
      );

      expect(patchBody.name).toBe("Updated Name");
      expect(patchBody.range).toBeUndefined();
      expect(patchBody.cadence).toEqual({
        type: "pace",
        period: "day",
        amount: 10,
      });
    });

    it("includes range in PATCH body when hasProgress is false", () => {
      const patchBody = buildCustomPatchBody(
        {
          ...baseState,
          name: "Typo fix",
          rangeMode: "page",
          startPage: 5,
          endPage: 15,
        },
        false // hasProgress
      );

      expect(patchBody.name).toBe("Typo fix");
      expect(patchBody.range).toEqual({
        mode: "page",
        startPage: 5,
        endPage: 15,
      });
    });

    it("omits repetitions in deadline PATCH when activity === 'memorize'", () => {
      const patchBody = buildCustomPatchBody(
        {
          ...baseState,
          cadenceType: "deadline",
          deadlineEndDate: "2026-12-31",
          repetitions: 4,
          activity: "memorize",
        },
        false
      );

      expect(patchBody.cadence).toEqual({
        type: "deadline",
        endDate: "2026-12-31",
      });
      expect((patchBody.cadence as { repetitions?: number }).repetitions).toBeUndefined();
    });
  });
});
