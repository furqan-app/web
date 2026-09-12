"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { TimeCombobox } from "@/components/ui/time-combobox";
import { useSettingsSidebar } from "@/app/contexts/SettingsSidebarContext";
import { usePushSubscription } from "@/app/hooks/use-push-subscription";
import { usePlans } from "@/app/hooks/use-plans";
import useTranslations from "@/app/hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { MAX_GENERAL_WIRD_REMINDERS } from "@/app/constants/notifications";

type GeneralSlot = {
  id: number;
  slot: number;
  time: string;
  timezone: string;
  locale: string;
  scheduledFor: string | null;
};

type DedicatedSlot = {
  id: number;
  planId: number;
  time: string;
  timezone: string;
  locale: string;
  scheduledFor: string | null;
};

type ReminderApiResponse = {
  general: GeneralSlot[];
  dedicated: DedicatedSlot[];
  enabled: boolean;
  time: string;
  timezone: string | null;
  locale: string | null;
};

type Props = {
  portalContainer?: HTMLElement | null;
};

const computeNextSlotTime = (slots: GeneralSlot[]): string => {
  if (slots.length === 0) return "08:00";
  const last = slots[slots.length - 1];
  const [h, m] = last.time.split(":").map(Number);
  const nextH = (h + 6) % 24;
  return `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export function DailyWirdReminderSection({ portalContainer: externalContainer }: Props = {}) {
  const t = useTranslations();
  const tIntl = useNextIntlTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { targetSection, clearTarget } = useSettingsSidebar();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sectionEl, setSectionEl] = useState<HTMLDivElement | null>(null);

  const setContainerRefs = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setSectionEl(el);
  }, []);

  const portalContainer = externalContainer ?? sectionEl;

  const { supported: pushSupported, permission, subscribed, subscribe, loading: pushLoading } =
    usePushSubscription();

  const { data: plans } = usePlans();

  const { data, isLoading, isError, refetch } = useQuery<ReminderApiResponse>({
    queryKey: ["daily-wird-reminder"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/daily-reminder");
      if (!res.ok) throw new Error("Failed to fetch reminder preference");
      const json = await res.json();
      return json.data;
    },
  });

  const enabled = data?.enabled ?? false;
  const generalSlots = data?.general ?? [];

  const { mutate: updateReminder, isPending: isUpdating } = useMutation({
    mutationFn: async (payload: {
      type?: "general" | "dedicated";
      slot?: number;
      planId?: number;
      enabled: boolean;
      time?: string;
      timezone?: string;
      locale?: string;
    }) => {
      const res = await fetch("/api/notifications/daily-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update reminder preference");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-wird-reminder"] });
    },
  });

  const getResolvedTimezone = () =>
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  const handleToggle = (next: boolean) => {
    if (!next) {
      updateReminder({ type: "general", enabled: false });
    } else {
      updateReminder({
        type: "general",
        slot: 1,
        time: "08:00",
        enabled: true,
        timezone: getResolvedTimezone(),
        locale,
      });
    }
  };

  const handleSlotTimeChange = (slot: number, nextTime: string) => {
    updateReminder({
      type: "general",
      slot,
      time: nextTime,
      enabled: true,
      timezone: getResolvedTimezone(),
      locale,
    });
  };

  const handleRemoveSlot = (slot: number) => {
    updateReminder({
      type: "general",
      slot,
      enabled: false,
    });
  };

  const handleAddSlot = () => {
    const usedSlots = new Set(generalSlots.map((g) => g.slot));
    let nextSlot = 1;
    for (let i = 1; i <= MAX_GENERAL_WIRD_REMINDERS; i++) {
      if (!usedSlots.has(i)) {
        nextSlot = i;
        break;
      }
    }
    const nextTime = computeNextSlotTime(generalSlots);
    updateReminder({
      type: "general",
      slot: nextSlot,
      time: nextTime,
      enabled: true,
      timezone: getResolvedTimezone(),
      locale,
    });
  };

  useEffect(() => {
    if (targetSection === "wird-reminder" && containerRef.current) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      containerRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? "instant" : "smooth",
        block: "center",
      });

      if (!prefersReducedMotion) {
        containerRef.current.classList.add("fq-focus-pulse");
      }
      const timer = setTimeout(() => {
        containerRef.current?.classList.remove("fq-focus-pulse");
        clearTarget();
      }, prefersReducedMotion ? 0 : 1200);
      return () => clearTimeout(timer);
    }
  }, [targetSection, clearTarget]);

  const isPushBlocked = !pushSupported || permission === "denied";
  const canPromptPush = pushSupported && permission !== "denied" && !subscribed && enabled;

  const activePlans = plans?.filter((p) => p.status === "active") ?? [];
  const dedicatedPlanIds = new Set((data?.dedicated ?? []).map((d) => d.planId));
  const allActivePlansBound =
    activePlans.length > 0 && activePlans.every((p) => dedicatedPlanIds.has(p.id));

  return (
    <div
      ref={setContainerRefs}
      id="settings-wird-reminder"
      data-testid="settings-section-wird-reminder"
    >
      {isError ? (
        <div className="fq-section-row py-2 text-xs text-destructive">
          <span>
            {t("notifications.settings.wirdReminderLoadError", "Failed to load reminder settings")}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-medium underline hover:opacity-80 shrink-0"
          >
            {t("notifications.settings.wirdReminderRetry", "Retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="fq-section-row">
            <label htmlFor="wird-reminder-switch" className="cursor-pointer flex-1 min-w-0">
              <span className="text-[13px] font-medium text-foreground leading-tight">
                {t("notifications.settings.wirdReminderTitle", "Daily Wird Reminders")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {t(
                  "notifications.settings.wirdReminderDescription",
                  "Daily reminders to keep up with your Quran reading at your preferred times"
                )}
              </p>
            </label>
            <Switch
              id="wird-reminder-switch"
              data-testid="wird-reminder-toggle"
              checked={enabled}
              disabled={isLoading || isUpdating}
              onCheckedChange={handleToggle}
            />
          </div>

          {enabled && (
            <div className="border-t border-dashed border-border bg-muted/25 px-3.5 py-3 space-y-2.5">
              {generalSlots.map((slot, index) => {
                const isFirst = index === 0;
                return (
                  <div
                    key={slot.slot}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="text-[12px] font-medium text-foreground shrink-0">
                      {tIntl("notifications.settings.wirdReminderSlotLabel", {
                        n: toLocaleNumeral(index + 1, locale),
                      })}
                    </label>
                    <div className="flex items-center gap-1.5 flex-1 justify-end max-w-[200px]">
                      <TimeCombobox
                        value={slot.time}
                        onChange={(newTime) => handleSlotTimeChange(slot.slot, newTime)}
                        disabled={isLoading || isUpdating}
                        portalContainer={portalContainer}
                        triggerTestId={
                          isFirst
                            ? "wird-reminder-time-trigger"
                            : `wird-reminder-time-trigger-slot-${slot.slot}`
                        }
                      />
                      {generalSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot.slot)}
                          disabled={isLoading || isUpdating}
                          aria-label={t("notifications.settings.wirdReminderRemove", "Remove this reminder")}
                          className="fq-focus-ring min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive flex items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {generalSlots.length < MAX_GENERAL_WIRD_REMINDERS ? (
                <button
                  type="button"
                  onClick={handleAddSlot}
                  disabled={isLoading || isUpdating}
                  className="w-full min-h-[44px] border border-dashed border-border/80 hover:bg-muted/30 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>{t("notifications.settings.wirdReminderAdd", "Add another time")}</span>
                </button>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center py-1">
                  {t(
                    "notifications.settings.wirdReminderMaxReached",
                    "Maximum of 3 general reminders reached"
                  )}
                </p>
              )}
            </div>
          )}

          {allActivePlansBound && enabled && (
            <div className="px-3.5 py-2.5 bg-muted/20 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed">
              {t(
                "notifications.settings.allPlansBoundNotice",
                "All your active plans have dedicated reminders. General reminders will not send alerts until an unbound plan is active."
              )}
            </div>
          )}

          {((isPushBlocked && enabled) || canPromptPush) && (
            <div className="px-3.5 pb-3 bg-muted/25 space-y-1.5">
              {isPushBlocked && enabled && (
                <p className="text-[11px] text-muted-foreground/80 leading-snug">
                  {t(
                    "notifications.settings.wirdReminderPushBlocked",
                    "Push notifications are blocked in your browser. Enable them in browser settings to receive reminders."
                  )}
                </p>
              )}

              {canPromptPush && (
                <button
                  type="button"
                  onClick={() => subscribe()}
                  disabled={pushLoading}
                  className="text-[11px] font-medium text-primary hover:underline leading-snug text-start block disabled:opacity-50"
                >
                  {t(
                    "notifications.settings.wirdReminderEnablePush",
                    "Enable push notifications on this device"
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
