"use client";

import { useCallback, useEffect, useState } from "react";
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/app/server/actions/notifications";

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from(raw.split("").map((char) => char.charCodeAt(0)));
};

/** Web Push permission + subscribe/unsubscribe flow. Must be called from a user gesture; only works in an installed PWA on iOS. */
export const usePushSubscription = () => {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  // Read-only mirror of Notification.permission. Surfaced (subtask 4.3) so the
  // UI can SHOW a denied browser permission instead of silently snapping the
  // toggle back off — a denial is unrecoverable in-app and the user has to be
  // told where to undo it. This reads state; it does not change the flow.
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");

  useEffect(() => {
    const check = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      setSupported(true);
      if ("Notification" in window) setPermission(Notification.permission);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setSubscribed(!!subscription);
    };
    check();
  }, []);

  const subscribe = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return false;

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const ok = await registerPushSubscription(subscription.toJSON());
      setSubscribed(ok);
      return ok;
    } catch (error) {
      // Permission denial, a malformed VAPID key, or the server call
      // throwing must not become an unhandled rejection out of the Switch's
      // onCheckedChange handler — surface as "stayed off" instead.
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;

      await subscription.unsubscribe();
      // The browser is now unsubscribed regardless of whether the server
      // call below succeeds — reflect that immediately rather than reading
      // a stale `subscribed` closure value on server failure.
      setSubscribed(false);

      const ok = await unregisterPushSubscription(subscription.endpoint);
      if (!ok) console.error("Failed to unregister push subscription on the server");
      return ok;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, subscribed, loading, permission, subscribe, unsubscribe };
};
