"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Switch } from "@/components/ui/switch";
import useTranslations from "@/app/hooks/use-translations";
import { isAutoWriteEnabled, setAutoWriteEnabled } from "@/app/lib/plans/auto-write-log";
import { storage } from "@/app/utils/storage";

export function AutoWriteSettingSection() {
  const t = useTranslations();
  const { status: sessionStatus, data: session } = useSession();
  const isSignedIn = sessionStatus === "authenticated";
  const userId = (session?.user as { id?: number } | undefined)?.id;

  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Re-read on account change so a second sign-in on the same browser
    // never displays (or toggles) the previous account's preference.
    // A legacy global boolean is dropped here, never promoted onto anyone.
    const stored = storage.get("awradAutoWriteCompletion");
    if (stored !== null && typeof stored !== "object") {
      storage.remove("awradAutoWriteCompletion");
    }
    setEnabled(isAutoWriteEnabled(userId));
  }, [userId]);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    setAutoWriteEnabled(userId, next);
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <div
      id="settings-autowrite"
      data-testid="settings-section-autowrite"
      className="space-y-3 pt-1"
    >
      <div className="fq-section-row">
        <label htmlFor="autowrite-switch" className="cursor-pointer flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground leading-tight">
            {t("plans.settings.autoWriteTitle", "Automatic Wird Completion")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {t(
              "plans.settings.autoWriteDescription",
              "Automatically record reading or listening progress once dwell or playback criteria are met, without prompting.",
            )}
          </p>
        </label>
        <Switch
          id="autowrite-switch"
          data-testid="settings-autowrite-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>
    </div>
  );
}
