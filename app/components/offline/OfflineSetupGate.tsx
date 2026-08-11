"use client";

import useTranslations from "@hooks/use-translations";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { OfflineDownloadPanel } from "@components/offline/OfflineDownloadPanel";

/**
 * First-run blocking gate for the installed PWA (ADR 0014 Addendum 2).
 *
 * Shown on the first standalone launch with nothing cached, so offline
 * readiness is an explicit up-front choice rather than something the user
 * discovers by going offline and finding the reader broken. Skippable — the
 * Settings row is the recovery path.
 *
 * Standalone only: it must never render in a browser tab (the `appinstalled`
 * prompt covers that case).
 */
export const OfflineSetupGate = () => {
  const t = useTranslations();
  const { isStandalone, state, cached, total, dismissed, start, cancel, dismiss } =
    usePwaPrecache();

  if (!isStandalone) return null;
  if (dismissed) return null;
  // `unknown` = the service worker has not answered yet; `done` = nothing to ask.
  if (state === "unknown" || state === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("offline.gateTitle", "Read the Quran offline")}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]">
        <OfflineDownloadPanel
          state={state}
          cached={cached}
          total={total}
          onDownload={start}
          onDismiss={state === "running" ? cancel : dismiss}
          dismissLabel={t("offline.skip", "Skip for now")}
          title={t("offline.gateTitle", "Read the Quran offline")}
        />
      </div>
    </div>
  );
};
