"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { TimeCombobox } from "@/components/ui/time-combobox";
import { useSettingsSidebar } from "@/app/contexts/SettingsSidebarContext";
import { usePushSubscription } from "@/app/hooks/use-push-subscription";
import useTranslations from "@/app/hooks/use-translations";
import { cn } from "@/lib/utils";

type ReminderApiResponse = {
  enabled: boolean;
  time: string;
  timezone: string | null;
  locale: string | null;
};

type Props = {
  portalContainer?: HTMLElement | null;
};

export function DailyWirdReminderSection({ portalContainer: externalContainer }: Props = {}) {
  const t = useTranslations();
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

  const { data, isLoading, isError, refetch } = useQuery<ReminderApiResponse>({
    queryKey: ["daily-wird-reminder"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/daily-reminder");
      if (!res.ok) throw new Error("Failed to fetch reminder preference");
      const json = await res.json();
      return json.data;
    },
  });

  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [localTime, setLocalTime] = useState<string | null>(null);

  const enabled = localEnabled !== null ? localEnabled : (data?.enabled ?? false);
  const time = localTime !== null ? localTime : (data?.time ?? "08:00");

  const { mutate: updateReminder, isPending: isUpdating } = useMutation({
    mutationFn: async (payload: { enabled: boolean; time: string; timezone: string; locale: string }) => {
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
      setLocalEnabled(null);
      setLocalTime(null);
    },
    onError: () => {
      setLocalEnabled(null);
      setLocalTime(null);
    },
  });

  const getResolvedTimezone = () =>
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  const handleToggle = (next: boolean) => {
    setLocalEnabled(next);
    updateReminder({
      enabled: next,
      time,
      timezone: getResolvedTimezone(),
      locale,
    });
  };

  const handleTimeChange = (nextTime: string) => {
    setLocalTime(nextTime);
    updateReminder({
      enabled: true,
      time: nextTime,
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

  return (
    <div
      ref={setContainerRefs}
      id="settings-wird-reminder"
      data-testid="settings-section-wird-reminder"
      className="space-y-3 pt-1"
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
            {t("notifications.settings.wirdReminderTitle", "Daily Wird Reminder")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            {t(
              "notifications.settings.wirdReminderDescription",
              "Daily reminder to keep up with your Quran reading at your preferred time"
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

      <div
        className={cn(
          "flex items-center justify-between gap-3 transition-opacity",
          !enabled && "opacity-50 pointer-events-none"
        )}
      >
        <label className="text-[12px] font-medium text-foreground shrink-0">
          {t("notifications.settings.wirdReminderTime", "Reminder Time")}
        </label>
        <div className="w-44">
          <TimeCombobox
            value={time}
            onChange={handleTimeChange}
            disabled={!enabled || isLoading || isUpdating}
            portalContainer={portalContainer}
          />
        </div>
      </div>

      {isPushBlocked && enabled && (
        <p className="text-[11px] text-muted-foreground/80 leading-snug">
          {t(
            "notifications.settings.wirdReminderPushBlocked",
            "Push notifications are blocked in your browser. Reminders will appear in your in-app feed."
          )}
        </p>
      )}

          {canPromptPush && (
            <button
              type="button"
              onClick={() => subscribe()}
              disabled={pushLoading}
              className="text-[11px] font-medium text-primary hover:underline leading-snug text-start"
            >
              {t(
                "notifications.settings.wirdReminderEnablePush",
                "Enable push notifications on this device"
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
