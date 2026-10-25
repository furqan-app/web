// Native push (ADR 0076) — Capacitor Android only. The plugin is dynamically
// imported (same pattern as @capacitor/app in NativeAppLinkListener): in
// Capacitor 8 a plugin is only registered on `window.Capacitor.Plugins` after
// its JS module has been imported, so looking the proxy up directly on the
// global would find nothing. The dynamic import also keeps @capacitor/* out of
// the web bundle unless the native shell actually asks for it.
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "@/app/server/actions/notifications";
import { isNativePlatform } from "@/app/utils/platform";

export type NativePushPermission = "granted" | "denied" | "prompt";

type PushNotificationsPlugin =
  typeof import("@capacitor/push-notifications")["PushNotifications"];

type ListenerHandle = { remove: () => void | Promise<void> };

// Cache the import promise itself: the plugin module is a process-wide
// singleton, and concurrent callers must share one import (a second
// simultaneous `import()` of the same mocked/side-effectful module is not
// guaranteed to resolve to the same namespace).
let pluginPromise: Promise<PushNotificationsPlugin | null> | null = null;

/** Resolve the Capacitor plugin, or null outside the native shell (or when the
 *  plugin module cannot be imported). Callers must handle null. */
export const getNativePushPlugin =
  async (): Promise<PushNotificationsPlugin | null> => {
    if (!isNativePlatform()) return null;
    if (!pluginPromise) {
      pluginPromise = import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications ?? null)
        .catch(() => null);
    }
    return pluginPromise;
  };

const normalizePermission = (
  receive: string | undefined
): NativePushPermission => {
  if (receive === "granted" || receive === "denied") return receive;
  // `prompt-with-rationale` (Android) is still an un-prompted state.
  return "prompt";
};

/** Current native permission state, or null when the plugin is unavailable. */
export const getNativePushPermission =
  async (): Promise<NativePushPermission | null> => {
    const plugin = await getNativePushPlugin();
    if (!plugin) return null;
    try {
      const current = await plugin.checkPermissions();
      return normalizePermission(current.receive);
    } catch {
      return null;
    }
  };

export const isNativePushSupported = async (): Promise<boolean> =>
  (await getNativePushPlugin()) !== null;

// Session-scoped hold of the last token this page registered, so toggle-off
// can DELETE the exact row it created and rotated tokens replace atomically.
let lastKnownToken: string | null = null;

// Only the registration listeners this module attached are tracked — the tap
// listener owned by NativePushTapListener must survive a toggle-off.
let registrationListenerAttached = false;
let tokenListenerHandles: ListenerHandle[] = [];

type RegistrationWaiter = (token: string | null) => void;

type ActiveRegistration = {
  promise: Promise<boolean>;
  waiters: RegistrationWaiter[];
  settle: (ok: boolean, token: string | null) => void;
};

// The in-flight registration, if any. Sequential/concurrent calls share this
// promise and each callback is notified when it settles — a second toggle-open
// can never wait on a listener that has already fired.
let activeRegistration: ActiveRegistration | null = null;

/** Safety valve: if neither `registration` nor `registrationError` ever fires,
 *  the toggle must not hang forever waiting on a dead bridge. */
export const NATIVE_PUSH_REGISTRATION_TIMEOUT_MS = 10_000;

// Test hook — the module state in this file is page-session-lifetime closure
// state; vitest resets per file, not per this module's singleton.
export const _resetNativePushStateForTests = (): void => {
  lastKnownToken = null;
  registrationListenerAttached = false;
  tokenListenerHandles = [];
  activeRegistration = null;
  pluginPromise = null;
};

const handleRegistrationEvent = async (
  token: string | null
): Promise<void> => {
  const registration = activeRegistration;
  if (!registration) {
    // Unsolicited event (FCM token rotation after the initial settle): keep
    // the server row current. The upsert is hash-idempotent.
    if (token) {
      lastKnownToken = token;
      await registerDeviceToken(token);
    } else {
      lastKnownToken = null;
    }
    return;
  }

  if (!token) {
    lastKnownToken = null;
    registration.settle(false, null);
    return;
  }

  lastKnownToken = token;
  const ok = await registerDeviceToken(token);
  registration.settle(ok, ok ? token : null);
};

/** Honors the addListener→register() ordering rule (ADR 0076): a token event
 *  fired before a listener exists is dropped, so listeners attach first. */
const attachRegistrationListener = async (
  plugin: PushNotificationsPlugin
): Promise<void> => {
  if (registrationListenerAttached) return;
  registrationListenerAttached = true;

  try {
    tokenListenerHandles.push(
      await plugin.addListener("registration", (event) => {
        void handleRegistrationEvent(event?.value ?? null);
      })
    );
    tokenListenerHandles.push(
      await plugin.addListener("registrationError", () => {
        void handleRegistrationEvent(null);
      })
    );
  } catch (error) {
    registrationListenerAttached = false;
    tokenListenerHandles.forEach((handle) => {
      try {
        void handle.remove();
      } catch {
        // Detaching a failed listener is best-effort.
      }
    });
    tokenListenerHandles = [];
    throw error;
  }
};

/** Remove only the handles this module created — never `removeAllListeners`,
 *  which would also tear down the notification-tap listener. */
const detachRegistrationListeners = async (): Promise<void> => {
  const handles = tokenListenerHandles;
  tokenListenerHandles = [];
  registrationListenerAttached = false;
  await Promise.all(
    handles.map(async (handle) => {
      try {
        await handle.remove();
      } catch {
        // Best-effort detach; the toggle state is already authoritative.
      }
    })
  );
};

const cancelActiveRegistration = (): void => {
  activeRegistration?.settle(false, null);
};

const registerAndAwaitToken = (
  plugin: PushNotificationsPlugin,
  onToken: RegistrationWaiter
): Promise<boolean> => {
  if (activeRegistration) {
    activeRegistration.waiters.push(onToken);
    return activeRegistration.promise;
  }

  const waiters: RegistrationWaiter[] = [onToken];
  let resolvePromise: (ok: boolean) => void = () => undefined;
  const promise = new Promise<boolean>((resolve) => {
    resolvePromise = resolve;
  });
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const settle = (ok: boolean, token: string | null) => {
    if (activeRegistration?.promise !== promise) return;
    if (timeout) clearTimeout(timeout);
    activeRegistration = null;
    waiters.forEach((waiter) => waiter(ok ? token : null));
    resolvePromise(ok);
  };

  activeRegistration = { promise, waiters, settle };

  void (async () => {
    // A token received earlier this session is already persisted — re-POST it
    // (idempotent upsert) instead of re-registering and waiting on an event
    // that may never fire again for the same token.
    if (lastKnownToken) {
      const token = lastKnownToken;
      const ok = await registerDeviceToken(token);
      settle(ok, token);
      return;
    }

    try {
      await attachRegistrationListener(plugin);
    } catch {
      settle(false, null);
      return;
    }

    timeout = setTimeout(() => {
      lastKnownToken = null;
      settle(false, null);
    }, NATIVE_PUSH_REGISTRATION_TIMEOUT_MS);

    try {
      await plugin.register();
    } catch {
      lastKnownToken = null;
      settle(false, null);
    }
  })();

  return promise;
};

/** Register with FCM (requesting Android 13+ POST_NOTIFICATIONS from the
 *  toggle's user gesture) and persist the token for the signed-in user.
 *  Resolves `true` only after the server confirms the token row. */
export const subscribeNativePush = async (
  onToken: (token: string | null) => void
): Promise<boolean> => {
  const plugin = await getNativePushPlugin();
  if (!plugin) return false;

  let perm: { receive: string };
  try {
    perm = await plugin.requestPermissions();
  } catch {
    return false;
  }
  if (perm.receive !== "granted") return false;

  return registerAndAwaitToken(plugin, onToken);
};

/** Quiet re-registration on mount when permission is already granted — keeps
 *  the server row current across FCM token rotation without prompting. This is
 *  a toggle/preference-surface effect, never a root-mounted fetch (root-layout
 *  network budget). Resolves the current permission state; never prompts. */
export const refreshNativePushRegistration = async (
  onToken: (token: string | null) => void
): Promise<NativePushPermission> => {
  const plugin = await getNativePushPlugin();
  if (!plugin) return "prompt";

  let current: { receive: string };
  try {
    current = await plugin.checkPermissions();
  } catch {
    return "prompt";
  }
  if (current.receive === "granted") {
    await registerAndAwaitToken(plugin, onToken);
  }
  return normalizePermission(current.receive);
};

/** Absent the plugin's own unregister concept, row deletion is the source of
 *  truth (ADR 0076): DELETE the last known token and detach the registration
 *  listeners so rotated tokens stop re-registering until the next toggle-on.
 *  A failed DELETE keeps the toggle on (the token row still exists) and
 *  leaves the listeners in place to keep the row current. */
export const unsubscribeNativePush = async (
  onToken: (token: string | null) => void
): Promise<boolean> => {
  const token = lastKnownToken;
  if (!token) {
    cancelActiveRegistration();
    await detachRegistrationListeners();
    onToken(null);
    return true;
  }

  const ok = await unregisterDeviceToken(token);
  if (!ok) return false;

  lastKnownToken = null;
  await detachRegistrationListeners();
  onToken(null);
  return true;
};
