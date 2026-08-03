"use client";

import useTranslations from "@hooks/use-translations";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/app/hooks/use-push-subscription";

/** Settings-sheet toggle to enable/disable Web Push notifications. Renders nothing when the browser doesn't support it. */
export const EnablePushToggle = () => {
  const t = useTranslations();
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  if (!supported) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {t("notifications.settings.title", "Notifications")}
      </h3>
      <div className="p-4 rounded-lg bg-muted flex items-center justify-between gap-3">
        <label htmlFor="enable-push-switch" className="cursor-pointer">
          <span className="text-sm font-medium">
            {t("notifications.settings.enablePush", "Push notifications")}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "notifications.settings.enablePushDescription",
              "Get notified about reminders and updates on this device"
            )}
          </p>
        </label>
        <Switch
          id="enable-push-switch"
          checked={subscribed}
          disabled={loading}
          onCheckedChange={(on) => (on ? subscribe() : unsubscribe())}
        />
      </div>
    </div>
  );
};
