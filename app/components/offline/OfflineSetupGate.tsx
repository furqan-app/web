"use client";

import useTranslations from "@hooks/use-translations";
import { usePwaPrecache } from "@hooks/use-pwa-precache";
import { OfflineDownloadPanel } from "@components/offline/OfflineDownloadPanel";
import { DEFAULT_MUSHAF_ID } from "@utils/mushaf-editions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * First-run blocking gate for the installed PWA (ADR 0014 Addendum 2).
 *
 * Shown on the first standalone launch with nothing cached, so offline
 * readiness is an explicit up-front choice rather than something the user
 * discovers by going offline and finding the reader broken. Skippable — the
 * Settings row is the recovery path.
 *
 * Built on the Radix dialog primitive rather than a hand-rolled fixed overlay:
 * blocking the page needs a real focus trap and scroll lock, which a bare
 * `fixed inset-0` with `aria-modal` only claims to have (a keyboard or
 * screen-reader user could Tab straight into the app behind it). Escape and
 * outside-pointer dismissal are both suppressed — the only ways out are Download
 * and Skip, so there is no route that closes the gate without a decision.
 *
 * Standalone only: it must never render in a browser tab (the `appinstalled`
 * prompt covers that case).
 */
export const OfflineSetupGate = () => {
  const t = useTranslations();
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
  } = usePwaPrecache(DEFAULT_MUSHAF_ID);

  if (!isStandalone) return null;
  if (dismissed) return null;
  // `done` is the only state with nothing to ask. `unknown` DOES render — the
  // panel shows a brief wait state, so the reader never paints behind a gate that
  // is about to cover it.
  if (state === "done") return null;

  const title = t("offline.gateTitle", "Read the Quran offline");

  return (
    <Dialog open>
      <DialogContent
        hideDefaultClose
        className="fq-panel-cast max-w-sm rounded-xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {/* The panel renders its own visible heading; these satisfy Radix's
            labelling contract without duplicating it on screen. */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {t(
            "offline.gateDescription",
            "Choose whether to download the Quran for offline reading.",
          )}
        </DialogDescription>
        <OfflineDownloadPanel
          state={state}
          cached={cached}
          total={total}
          failed={failed}
          onDownload={start}
          onDismiss={state === "running" ? cancel : dismiss}
          dismissLabel={t("offline.skip", "Skip for now")}
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
};
