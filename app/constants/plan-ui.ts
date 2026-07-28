/**
 * UI-only display metadata for the plan engine (ADR 0030) — i18n keys and
 * icons for templates/tracks/activities. Kept out of app/constants/plans.ts
 * so the engine-facing template shape stays pure (no UI concerns).
 */

import {
  BookOpen,
  Brain,
  Castle,
  Headphones,
  RotateCcw,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { PlanActivity } from "@/app/constants/plans";

export const PLAN_TEMPLATE_UI: Record<
  string,
  { labelKey: string; defaultLabel: string; descriptionKey: string; defaultDescription: string; icon: LucideIcon }
> = {
  "daily-wird": {
    labelKey: "plans.templates.dailyWird.label",
    defaultLabel: "Daily Wird",
    descriptionKey: "plans.templates.dailyWird.description",
    defaultDescription: "Read N pages a day, cycling the whole mushaf.",
    icon: BookOpen,
  },
  "listening-wird": {
    labelKey: "plans.templates.listeningWird.label",
    defaultLabel: "Listening Wird",
    descriptionKey: "plans.templates.listeningWird.description",
    defaultDescription: "Listen to N pages a day, cycling the whole mushaf.",
    icon: Headphones,
  },
  husun: {
    labelKey: "plans.templates.husun.label",
    defaultLabel: "الحصون الخمسة",
    descriptionKey: "plans.templates.husun.description",
    defaultDescription: "A structured 5-track memorization program.",
    icon: Castle,
  },
};

export const PLAN_TRACK_UI: Record<string, { labelKey: string; defaultLabel: string; icon: LucideIcon }> = {
  reading: { labelKey: "plans.tracks.reading", defaultLabel: "Reading", icon: BookOpen },
  listening: { labelKey: "plans.tracks.listening", defaultLabel: "Listening", icon: Headphones },
  tilawa: { labelKey: "plans.tracks.tilawa", defaultLabel: "القراءة المستمرة", icon: BookOpen },
  hifz: { labelKey: "plans.tracks.hifz", defaultLabel: "الحفظ الجديد", icon: Brain },
  tahdeer: { labelKey: "plans.tracks.tahdeer", defaultLabel: "التحضير", icon: Headphones },
  qareeb: { labelKey: "plans.tracks.qareeb", defaultLabel: "مراجعة القريب", icon: RotateCcw },
  baeed: { labelKey: "plans.tracks.baeed", defaultLabel: "مراجعة البعيد", icon: RefreshCw },
};

export const PLAN_ACTIVITY_UI: Record<PlanActivity, { labelKey: string; defaultLabel: string }> = {
  read: { labelKey: "plans.activities.read", defaultLabel: "Read" },
  listen: { labelKey: "plans.activities.listen", defaultLabel: "Listen" },
  memorize: { labelKey: "plans.activities.memorize", defaultLabel: "Memorize" },
  review: { labelKey: "plans.activities.review", defaultLabel: "Review" },
};
