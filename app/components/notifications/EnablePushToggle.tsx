"use client";

import { Loader2 } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@components/settings/SettingsSection";
import { usePushSubscription } from "@/app/hooks/use-push-subscription";

/** Settings-sheet toggle to enable/disable Web Push notifications. Renders nothing when the browser doesn't support it. */
export const EnablePushToggle = () => {
  const t = useTranslations();
  const { supported, subscribed, loading, permission, subscribe, unsubscribe } =
    usePushSubscription();

  if (!supported) return null;

  // Browser-level denial is unrecoverable from inside the page: requesting
  // again is a no-op, so the switch would flip and snap back with no
  // explanation. Native `disabled`, not aria-disabled, plus a line saying
  // where the user can actually undo it.
  const denied = permission === "denied";

  return (
    <SettingsSection title={t("notifications.settings.title", "Notifications")}>
      <div className="fq-section-row">
        <label htmlFor="enable-push-switch" className={denied ? undefined : "cursor-pointer"}>
          <span className="text-sm font-medium">
            {t("notifications.settings.enablePush", "Push notifications")}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
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
          {/* Pending is expressed once, from the same state that disables the
              control, so it can never show two readings of itself at once. */}
          {loading ? (
            <Loader2 className="size-4 animate-spin text-[hsl(var(--control-inert))]" aria-hidden="true" />
          ) : null}
          <Switch
            id="enable-push-switch"
            checked={subscribed}
            disabled={loading || denied}
            onCheckedChange={(on) => (on ? subscribe() : unsubscribe())}
          />
        </span>
      </div>
    </SettingsSection>
  );
};
