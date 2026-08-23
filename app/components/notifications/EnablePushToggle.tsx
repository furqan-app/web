"use client";

import { Loader2 } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/app/hooks/use-push-subscription";

/** Settings-sheet toggle to enable/disable Web Push notifications. Renders nothing when the browser doesn't support it. */
export const EnablePushToggle = () => {
  const t = useTranslations();
  const { supported, subscribed, loading, permission, subscribe, unsubscribe } =
    usePushSubscription();

  if (!supported) return null;

  const denied = permission === "denied";

  return (
    <div className="fq-section-row">
      <label
        htmlFor="enable-push-switch"
        className={denied ? "flex-1 min-w-0" : "cursor-pointer flex-1 min-w-0"}
      >
        <span className="text-[13px] font-medium text-foreground leading-tight">
          {t("notifications.settings.enablePush", "Push notifications")}
        </span>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
          {denied
            ? t(
                "notifications.settings.enablePushDenied",
                "Blocked by your browser — allow notifications in site settings to turn this on.",
              )
            : t(
                "notifications.settings.enablePushDescription",
                "Get notified about reminders and updates on this device",
              )}
        </p>
      </label>
      <span className="flex flex-none items-center gap-2">
        {loading ? (
          <Loader2
            className="size-4 animate-spin text-[hsl(var(--control-inert))]"
            aria-hidden="true"
          />
        ) : null}
        <Switch
          id="enable-push-switch"
          checked={subscribed}
          disabled={loading || denied}
          onCheckedChange={(on) => (on ? subscribe() : unsubscribe())}
        />
      </span>
    </div>
  );
};
