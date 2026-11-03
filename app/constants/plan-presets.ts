import type { CreateCustomPlanBody } from "@/app/lib/plans/validate-custom-definition";
import { BookOpen, Calendar, Moon, Sparkles, type LucideIcon } from "lucide-react";

export type PlanPreset = {
  id: string;
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  icon: LucideIcon;
  payload: CreateCustomPlanBody;
  /** Optional default reminder time ("HH:MM", 15-minute boundary) for tailored presets */
  defaultReminderTime?: string;
};

export const READY_MADE_PRESETS: PlanPreset[] = [
  {
    id: "mulk-daily",
    titleKey: "plans.presets.mulkDaily.title",
    defaultTitle: "Surah Al-Mulk daily",
    descriptionKey: "plans.presets.mulkDaily.description",
    defaultDescription: "Read Surah Al-Mulk every day",
    icon: Moon,
    defaultReminderTime: "22:00",
    payload: {
      template_key: "custom",
      name: "Surah Al-Mulk",
      activity: "read",
      range: {
        mode: "surah",
        startSurah: 67,
        endSurah: 67,
      },
      cadence: {
        type: "daily",
      },
    },
  },
  {
    id: "kahf-weekly",
    titleKey: "plans.presets.kahfWeekly.title",
    defaultTitle: "Surah Al-Kahf every Friday",
    descriptionKey: "plans.presets.kahfWeekly.description",
    defaultDescription: "Read Surah Al-Kahf every Friday",
    icon: Calendar,
    defaultReminderTime: "10:00",
    payload: {
      template_key: "custom",
      name: "Surah Al-Kahf",
      activity: "read",
      range: {
        mode: "surah",
        startSurah: 18,
        endSurah: 18,
      },
      cadence: {
        type: "weekly",
        weekday: 5,
      },
    },
  },
  {
    id: "monthly-khatma",
    titleKey: "plans.presets.monthlyKhatma.title",
    defaultTitle: "Monthly Khatma (1 juz/day)",
    descriptionKey: "plans.presets.monthlyKhatma.description",
    defaultDescription: "Read 1 full juz (20 pages) daily through the whole Quran with repeat",
    icon: BookOpen,
    payload: {
      template_key: "custom",
      name: "Monthly Khatma",
      activity: "read",
      range: {
        mode: "page",
        startPage: 1,
        endPage: 604,
      },
      cadence: {
        type: "pace",
        period: "day",
        amount: 20,
        repeat: true,
      },
    },
  },
  {
    id: "tayseer-khatma",
    titleKey: "plans.presets.tayseerKhatma.title",
    defaultTitle: "Ease Khatma (half page/day)",
    descriptionKey: "plans.presets.tayseerKhatma.description",
    defaultDescription: "Read half a page daily through the whole Quran with repeat",
    icon: Sparkles,
    payload: {
      template_key: "custom",
      name: "Ease Khatma",
      activity: "read",
      range: {
        mode: "page",
        startPage: 1,
        endPage: 604,
      },
      cadence: {
        type: "pace",
        period: "day",
        amount: 0.5,
        repeat: true,
      },
    },
  },
];
