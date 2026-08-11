"use client";

import useTranslations from "@hooks/use-translations";
import { useAppInstalled } from "@hooks/use-app-installed";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { OfflineDownloadPanel } from "@components/offline/OfflineDownloadPanel";

/**
 * In-tab offer to download the Quran immediately after install, so the transfer
 * finishes before the installed app is ever opened (ADR 0014 Addendum 2).
 *
 * Gated on a real `appinstalled` event — Chromium only, and the reason a browser
 * tab is permitted to download page fonts at all: a completed install plus an
 * explicit tap is the consent that replaced the old `display-mode` gate. A tab
 * that has seen no install event must download nothing, ever.
 *
 * Best-effort: closing the tab mid-download may have the service worker killed.
 * The run is resumable and the first-run gate finishes it.
 */
export const OfflineInstallPrompt = () => {
  const t = useTranslations();
  const installed = useAppInstalled();
  const { isStandalone, state, cached, total, dismissed, start, cancel, dismiss } =
    usePwaPrecache();

  // The installed app has the gate; this surface is for the browser tab only.
  if (isStandalone) return null;
  if (!installed) return null;
  if (dismissed) return null;
  if (state === "unknown" || state === "done") return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto w-auto max-w-sm rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] sm:inset-x-auto sm:end-4 sm:w-full">
      <OfflineDownloadPanel
        state={state}
        cached={cached}
        total={total}
        onDownload={start}
        onDismiss={state === "running" ? cancel : dismiss}
        dismissLabel={t("offline.notNow", "Not now")}
        title={t("offline.installedTitle", "Furqan is installed")}
        leadIn={t(
          "offline.installedBody",
          "Download the Quran now so you can read it offline.",
        )}
      />
    </div>
  );
};
