import { describe, expect, it } from "vitest";
import { MARK_CATEGORIES } from "@/app/constants/marks";
import { getSurahMeta, normalizeVerseKey } from "@/app/utils/quran-navigation";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import {
  RotateCcw,
  GitCompareArrows,
  ScanText,
  AudioWaveform,
  Link as LinkIcon,
  Ellipsis,
} from "lucide-react";
import { evaluateMarkModalGates } from "@/app/lib/marks/gates";

describe("MarkModal & MarkerColorPicker Design Architecture", () => {
  describe("MARK_CATEGORIES distinct icon catalog", () => {
    it("contains all 6 required mark categories", () => {
      expect(MARK_CATEGORIES.length).toBe(6);
      expect(MARK_CATEGORIES.map((c) => c.key)).toEqual([
        "forgetting",
        "similar",
        "tashkeel-error",
        "tajweed-error",
        "linking",
        "other",
      ]);
    });

    it("assigns distinct semantic Lucide icons per category", () => {
      const categoryMap = Object.fromEntries(
        MARK_CATEGORIES.map((c) => [c.key, c.icon]),
      );

      expect(categoryMap["forgetting"]).toBe(RotateCcw);
      expect(categoryMap["similar"]).toBe(GitCompareArrows);
      expect(categoryMap["tashkeel-error"]).toBe(ScanText);
      expect(categoryMap["tajweed-error"]).toBe(AudioWaveform);
      expect(categoryMap["linking"]).toBe(LinkIcon);
      expect(categoryMap["other"]).toBe(Ellipsis);
    });

    it("provides badge background and text tokens for all categories", () => {
      MARK_CATEGORIES.forEach((category) => {
        expect(category.badgeBg).toBeTruthy();
        expect(category.badgeText).toBeTruthy();
        expect(category.chip).toBeTruthy();
        expect(category.labelKey).toContain("markModal.");
      });
    });
  });

  describe("Header Context & Verse Key Resolution", () => {
    it("correctly resolves Surah metadata and localized Ayah number", () => {
      const verseKey = "4:10";
      const normalized = normalizeVerseKey(verseKey) ?? "1:1";
      const [surahStr, ayahStr] = normalized.split(":");
      const surahNum = parseInt(surahStr, 10);
      const ayahNum = parseInt(ayahStr, 10);

      const meta = getSurahMeta(surahNum);
      expect(meta?.nameArabic).toBe("النساء");
      expect(meta?.nameSimple).toBe("An-Nisa");

      const ayahArabic = toLocaleNumeral(ayahNum, "ar");
      expect(ayahArabic).toBe("١٠");

      const ayahEnglish = toLocaleNumeral(ayahNum, "en");
      expect(ayahEnglish).toBe("10");
    });
  });

  describe("Locale Direction for Form Placeholders", () => {
    it("resolves RTL for Arabic and LTR for English", () => {
      expect(getLanguageDirection("ar")).toBe("rtl");
      expect(getLanguageDirection("en")).toBe("ltr");
    });
  });

  describe("Offline & Guest Marking Gating Matrix (#550)", () => {
    it("allows signed-in users on self mushaf to mark both online and offline", () => {
      const online = evaluateMarkModalGates({
        sessionUser: { id: "user_1" },
        ownerStamp: "user_1",
        isStandalone: false,
        isOffline: false,
      });
      expect(online.canMark).toBe(true);
      expect(online.inputsDisabled).toBe(false);

      const offline = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "user_1",
        isStandalone: false,
        isOffline: true,
      });
      expect(offline.canMark).toBe(true);
      expect(offline.inputsDisabled).toBe(false);
    });

    it("allows guests in installed PWA (standalone) to mark both online and offline", () => {
      const onlinePwa = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "guest",
        isStandalone: true,
        isOffline: false,
      });
      expect(onlinePwa.canMark).toBe(true);
      expect(onlinePwa.canGuestMark).toBe(true);
      expect(onlinePwa.inputsDisabled).toBe(false);

      const offlinePwa = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "guest",
        isStandalone: true,
        isOffline: true,
      });
      expect(offlinePwa.canMark).toBe(true);
      expect(offlinePwa.canGuestMark).toBe(true);
      expect(offlinePwa.inputsDisabled).toBe(false);
    });

    it("gates guests in a normal browser tab behind the sign-in wall", () => {
      const tabGuest = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "guest",
        isStandalone: false,
        isOffline: false,
      });
      expect(tabGuest.canMark).toBe(false);
    });

    it("enforces sign-in wall in a normal browser tab after sign-out despite sticky ownerStamp", () => {
      const signedOutUser = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "user_1",
        isStandalone: false,
        isOffline: false,
      });
      expect(signedOutUser.canMark).toBe(false);
      expect(signedOutUser.isSignedIn).toBe(false);
    });

    it("keeps grant mushaf gated on authentication and disabled offline (Test Case 6)", () => {
      const grantOnline = evaluateMarkModalGates({
        sessionUser: { id: "user_1" },
        ownerStamp: "user_1",
        isStandalone: false,
        grantId: "grant-123",
        isOffline: false,
      });
      expect(grantOnline.canMark).toBe(true);
      expect(grantOnline.inputsDisabled).toBe(false);

      const grantOffline = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "user_1",
        isStandalone: false,
        grantId: "grant-123",
        isOffline: true,
      });
      expect(grantOffline.canMark).toBe(true);
      expect(grantOffline.inputsDisabled).toBe(true);

      const grantGuest = evaluateMarkModalGates({
        sessionUser: null,
        ownerStamp: "guest",
        isStandalone: true,
        grantId: "grant-123",
        isOffline: false,
      });
      expect(grantGuest.canMark).toBe(false);
    });
  });

  describe("i18n Key Coverage for MarkModal (#550)", () => {
    it("has required keys in both en.json and ar.json", async () => {
      const en = (await import("@/messages/en.json")).default;
      const ar = (await import("@/messages/ar.json")).default;

      const requiredKeys = [
        "savedLocally",
        "guestPrompt",
        "dismissGuestPrompt",
        "offlineNotice",
      ] as const;

      for (const key of requiredKeys) {
        expect(en.markModal[key]).toBeTruthy();
        expect(ar.markModal[key]).toBeTruthy();
      }
    });
  });
});

