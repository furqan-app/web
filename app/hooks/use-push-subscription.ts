"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/app/server/actions/notifications";
import { isNativePlatform } from "@/app/utils/platform";
import {
  type NativePushPermission,
  getNativePushPermission,
  isNativePushSupported,
  refreshNativePushRegistration,
  subscribeNativePush,
  unsubscribeNativePush,
} from "@/app/lib/shell/native-push";

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from(raw.split("").map((char) => char.charCodeAt(0)));
};

export const SW_READY_TIMEOUT_MS = 4000;

export function getServiceWorkerReady(
  timeoutMs = SW_READY_TIMEOUT_MS
): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.reject(new Error("Service worker is not supported"));
  }

  let timer: NodeJS.Timeout | number;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Service worker ready timed out"));
    }, timeoutMs);
  });

  return Promise.race([navigator.serviceWorker.ready, timeoutPromise]).finally(
    () => {
      clearTimeout(timer);
    }
  );
}

/**
 * Push permission + subscribe/unsubscribe flow, branching once on platform
 * (ADR 0072/0076): inside the Capacitor shell it drives the native FCM flow
 * (`@capacitor/push-notifications`); everywhere else it is the Web Push flow,
 * unchanged. Must be called from a user gesture for subscribe().
 */
export const usePushSubscription = () => {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  // Read-only mirror of Notification.permission (web) or the plugin's
  // permission state (native). Surfaced (subtask 4.3) so the UI can SHOW a
  // denied permission instead of silently snapping the toggle back off — a
  // denial is unrecoverable in-app and the user has to be told where to undo
  // it. This reads state; it does not change the flow.
  const [permission, setPermission] = useState<NotificationPermission | NativePushPermission | "unknown">(
    "unknown"
  );

  // Late async callbacks (token registration, permission reads) must not
  // mutate state after the settings surface unmounts.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // Native shell (ADR 0076): the WebView has no service worker or
      // PushManager — the Native Push module owns the flow instead.
      if (isNativePlatform()) {
        if (!(await isNativePushSupported()) || cancelled) return;
        setSupported(true);
        const perm = await refreshNativePushRegistration((token) => {
          if (!cancelled && token) setSubscribed(true);
        });
        if (!cancelled) setPermission(perm);
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      setSupported(true);
      if ("Notification" in window) setPermission(Notification.permission);
      try {
        const registration = await getServiceWorkerReady();
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(!!subscription);
      } catch {
        // Service worker not ready or timed out (e.g. disabled in development)
        // Keep subscribed false and avoid hanging promises
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      // Native shell: permission request is the toggle's user gesture; the
      // promise resolves only after the token is saved server-side.
      if (isNativePlatform()) {
        const ok = await subscribeNativePush((token) => {
          if (mountedRef.current) setSubscribed(!!token);
        });
        if (ok) {
          setPermission("granted");
        } else {
          // A denial is unrecoverable in-app — surface the real permission
          // state so the UI can point the user at Android settings. A granted
          // permission with a failed registration keeps "granted" (the toggle
          // stays off because the server row was never created).
          const perm = await getNativePushPermission();
          if (perm && mountedRef.current) setPermission(perm);
        }
        return ok;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return false;

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await getServiceWorkerReady();
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
      // Native shell: row deletion is the source of truth (no plugin-side
      // unregister concept exists — ADR 0076).
      if (isNativePlatform()) {
        const ok = await unsubscribeNativePush((token) => {
          if (!token && mountedRef.current) setSubscribed(false);
        });
        // A server DELETE failure leaves the token row live: keep the toggle
        // on rather than lying about the subscription state (same discipline
        // as the web branch below).
        if (!ok) {
          console.error("Failed to unregister device token on the server");
        }
        return ok;
      }

      const registration = await getServiceWorkerReady();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;

      await subscription.unsubscribe();
      // The browser is now unsubscribed regardless of whether the server
      // call below succeeds — reflect that immediately rather than reading a
      // stale `subscribed` closure value on server failure.
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
