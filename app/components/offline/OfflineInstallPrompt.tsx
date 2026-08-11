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
 *
 * Not a modal — it must not block the page it appears over, so it stays a
 * dismissible card at `z-50` (the app's Radix ceiling; a higher value floated it
 * above an open Settings sheet). Anchored clear of the two other fixed
 * bottom-corner elements: `RecitationPlayerBar` (full-width, ~76px tall) and
 * `PlansWidget` (`bottom-20 end-4`), hence bottom-24 on the start side.
 */
export const OfflineInstallPrompt = () => {
  const t = useTranslations();
  const installed = useAppInstalled();
  const {
    isStandalone,
    state,
    cached,
    total,
    failed,
    dismissed,
    start,
    cancel,
    dismiss,
  } = usePwaPrecache();

  // The installed app has the gate; this surface is for the browser tab only.
  if (isStandalone) return null;
  if (!installed) return null;
  if (dismissed) return null;
  // Unlike the gate, this surface has nothing to cover, so it stays hidden until
  // the service worker has actually reported something to act on.
  if (state === "unknown" || state === "done") return null;

  return (
    <div
      className="fixed bottom-24 start-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)] sm:w-full"
      role="dialog"
      aria-label={t("offline.installedTitle", "Furqan is installed")}
    >
      <OfflineDownloadPanel
        state={state}
        cached={cached}
        total={total}
        failed={failed}
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
