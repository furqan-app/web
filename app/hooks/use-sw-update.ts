"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects a service-worker update that has already taken control in the
 * background — skipWaiting/clientsClaim stay true (ADR 0014 Addendum 4), so
 * there is no waiting-SW gate to hook; `controllerchange` is the only signal.
 * That event also fires on a tab's very first SW activation, which is not an
 * update, so only a `controllerchange` following an EXISTING controller
 * counts as one.
 */
export const useSwUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const hadController = useRef(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    hadController.current = navigator.serviceWorker.controller !== null;

    const onControllerChange = () => {
      if (hadController.current) setUpdateAvailable(true);
      hadController.current = true;
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const reload = () => window.location.reload();

  return { updateAvailable, reload };
};
