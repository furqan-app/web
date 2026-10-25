import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.hoisted(() => ({
  plugin: null as unknown,
}));

// Capacitor 8 registers a plugin on the global only after its module is
// imported. The module under test must therefore resolve it through a dynamic
// import — mocked here exactly like @capacitor/app in NativeAppLinkListener.
vi.mock("@capacitor/push-notifications", () => ({
  get PushNotifications() {
    return pushMock.plugin;
  },
}));

import {
  NATIVE_PUSH_REGISTRATION_TIMEOUT_MS,
  _resetNativePushStateForTests,
  isNativePushSupported,
  subscribeNativePush,
  refreshNativePushRegistration,
  unsubscribeNativePush,
} from "@/app/lib/shell/native-push";

type RegistryRecord = {
  event: string;
  cb: (e: unknown) => void;
  handle: { remove: ReturnType<typeof vi.fn> };
};
type FetchCall = { url: string; init: RequestInit };

const makePlugin = (opts?: { permission?: "granted" | "denied" | "prompt" }) => {
  const addListenerRecords: RegistryRecord[] = [];
  let registerCount = 0;
  const registrationHandlers: ((e: unknown) => void)[] = [];
  const permission = opts?.permission ?? "granted";
  const fake = {
    checkPermissions: vi.fn(async () => ({ receive: permission })),
    requestPermissions: vi.fn(async () => ({ receive: permission })),
    register: vi.fn(() => {
      registerCount += 1;
      // The token event fires asynchronously after register() — the ordering
      // the module must handle (listeners before register()).
      queueMicrotask(() => {
        registrationHandlers.forEach((cb) => cb({ value: "native-token-9" }));
      });
      return Promise.resolve();
    }),
    addListener: vi.fn(async (event: string, cb: (e: unknown) => void) => {
      const handle = { remove: vi.fn() };
      addListenerRecords.push({ event, cb, handle });
      if (event === "registration") registrationHandlers.push(cb);
      return handle;
    }),
    removeAllListeners: vi.fn(async () => undefined),
    getItemCount: () => ({ addListenerRecords, registerCount }),
  };
  return fake;
};

// No DOM environment here (repo tests are pure node + react-test-renderer) —
// the module only reads `window`, so a vi.stubGlobal object is the bridge.
let windowValue: Record<string, unknown> | undefined = undefined;
const stubWindow = () => {
  windowValue = {};
  vi.stubGlobal("window", windowValue);
};
const setCapacitor = (plugin: unknown) => {
  pushMock.plugin = plugin;
  windowValue!.Capacitor = {
    isNativePlatform: () => true,
  };
};

const bodyToken = (call: FetchCall): string =>
  (JSON.parse(String(call.init.body)) as { token: string }).token;

describe("app/lib/shell/native-push", () => {
  let fetchCalls: FetchCall[];
  const fetchJson = (success: boolean = true) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        fetchCalls.push({ url, init });
        return new Response(JSON.stringify({ success }), { status: success ? 200 : 500 });
      })
    );
  };

  beforeEach(() => {
    _resetNativePushStateForTests();
    pushMock.plugin = null;
    fetchCalls = [];
    fetchJson();
    stubWindow();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is unsupported without the plugin module — the settings row stays hidden on web", async () => {
    setCapacitor(null);
    await expect(isNativePushSupported()).resolves.toBe(false);
  });

  it("is supported when the shell can import the native plugin", async () => {
    setCapacitor(makePlugin());
    await expect(isNativePushSupported()).resolves.toBe(true);
  });

  it("subscribe: requests permission, attaches listeners before register, and resolves true only after the POST", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);
    const onToken = vi.fn();

    const outcome = await subscribeNativePush(onToken);

    expect(outcome).toBe(true);
    expect(plugin.requestPermissions).toHaveBeenCalled();
    expect(plugin.getItemCount().registerCount).toBe(1);
    // Listeners attached before register().
    const listenerEvents = plugin.getItemCount().addListenerRecords.map((r) => r.event);
    expect(listenerEvents).toEqual(["registration", "registrationError"]);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe("/api/notifications/device-tokens");
    expect(fetchCalls[0].init.method).toBe("POST");
    expect(bodyToken(fetchCalls[0])).toBe("native-token-9");
    expect(onToken).toHaveBeenCalledWith("native-token-9");
  });

  it("subscribe: resolves false and never POSTs on a denied permission", async () => {
    const plugin = makePlugin({ permission: "denied" });
    setCapacitor(plugin);

    const outcome = await subscribeNativePush(vi.fn());

    expect(outcome).toBe(false);
    expect(plugin.getItemCount().registerCount).toBe(0);
    expect(fetchCalls).toHaveLength(0);
  });

  it("subscribe: resolves false when register() fails before any token arrives", async () => {
    const plugin = makePlugin();
    plugin.register = vi.fn(async () => {
      throw new Error("bridge down");
    });
    setCapacitor(plugin);

    const outcome = await subscribeNativePush(vi.fn());

    expect(outcome).toBe(false);
    expect(fetchCalls).toHaveLength(0);
  });

  it("subscribe: a second call after a successful registration settles instead of hanging", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);
    const firstToken = vi.fn();
    const secondToken = vi.fn();

    await expect(subscribeNativePush(firstToken)).resolves.toBe(true);
    // Re-opening the settings surface must not wait on a registration event
    // that already fired; the known token is re-POSTed (idempotent upsert).
    await expect(subscribeNativePush(secondToken)).resolves.toBe(true);

    expect(secondToken).toHaveBeenCalledWith("native-token-9");
    expect(fetchCalls).toHaveLength(2);
    expect(plugin.removeAllListeners).not.toHaveBeenCalled();
  });

  it("subscribe: concurrent calls share one registration and both callbacks settle", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);
    const firstToken = vi.fn();
    const secondToken = vi.fn();

    const [first, second] = await Promise.all([
      subscribeNativePush(firstToken),
      subscribeNativePush(secondToken),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(plugin.getItemCount().registerCount).toBe(1);
    expect(fetchCalls).toHaveLength(1);
    expect(firstToken).toHaveBeenCalledWith("native-token-9");
    expect(secondToken).toHaveBeenCalledWith("native-token-9");
  });

  it("subscribe: times out safely when neither registration event ever fires", async () => {
    vi.useFakeTimers();
    const plugin = makePlugin();
    // Never emits a token — simulates a dead/blocked FCM bridge.
    plugin.register = vi.fn(async () => undefined);
    setCapacitor(plugin);
    const onToken = vi.fn();

    const pending = subscribeNativePush(onToken);
    // Flush the dynamic import, permission check and register() microtasks.
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(NATIVE_PUSH_REGISTRATION_TIMEOUT_MS);

    await expect(pending).resolves.toBe(false);
    expect(onToken).toHaveBeenCalledWith(null);
  });

  it("refresh: registers quietly when already granted (token rotation upsert), never prompts", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);

    const perm = await refreshNativePushRegistration(vi.fn());

    expect(perm).toBe("granted");
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
    expect(plugin.getItemCount().registerCount).toBe(1);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].init.method).toBe("POST");
  });

  it("refresh: does not register when permission is not granted", async () => {
    const plugin = makePlugin({ permission: "prompt" });
    setCapacitor(plugin);

    const perm = await refreshNativePushRegistration(vi.fn());

    expect(perm).toBe("prompt");
    expect(plugin.getItemCount().registerCount).toBe(0);
    expect(fetchCalls).toHaveLength(0);
  });

  it("a later token event re-POSTs (FCM rotation) without touching the toggle", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);
    await subscribeNativePush(vi.fn());

    // Simulate a rotated token arriving after the initial settle.
    const allHandlers = plugin
      .getItemCount()
      .addListenerRecords.filter((r) => r.event === "registration");
    allHandlers.forEach((r) => r.cb({ value: "rotated-token-10" }));

    await vi.waitFor(() => {
      expect(fetchCalls.length).toBe(2);
    });
    expect(bodyToken(fetchCalls[1])).toBe("rotated-token-10");
  });

  it("unsubscribe: DELETEs the last known token and detaches only its own listeners", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);
    const onToken = vi.fn();
    await subscribeNativePush(vi.fn());

    // The tap listener belongs to NativePushTapListener — toggling push off
    // must never remove it.
    const tapHandle = await plugin.addListener(
      "pushNotificationActionPerformed",
      () => undefined
    );
    const registrationHandles = plugin
      .getItemCount()
      .addListenerRecords.filter((r) => r.event !== "pushNotificationActionPerformed")
      .map((r) => r.handle);

    const outcome = await unsubscribeNativePush(onToken);

    expect(outcome).toBe(true);
    expect(fetchCalls[1].init.method).toBe("DELETE");
    expect(fetchCalls[1].url).toBe("/api/notifications/device-tokens");
    expect(JSON.parse(String(fetchCalls[1].init.body))).toEqual({ token: "native-token-9" });
    registrationHandles.forEach((handle) => expect(handle.remove).toHaveBeenCalled());
    expect(tapHandle.remove).not.toHaveBeenCalled();
    expect(plugin.removeAllListeners).not.toHaveBeenCalled();
    expect(onToken).toHaveBeenCalledWith(null);
  });

  it("unsubscribe: a failed DELETE keeps the subscription state (toggle stays on)", async () => {
    const plugin = makePlugin();
    setCapacitor(plugin);
    const onToken = vi.fn();
    await subscribeNativePush(vi.fn());
    fetchJson(false);

    const outcome = await unsubscribeNativePush(onToken);

    expect(outcome).toBe(false);
    expect(onToken).not.toHaveBeenCalledWith(null);
    // Registration listeners stay attached so a rotated token can still keep
    // the server row current while the toggle remains on.
    expect(plugin.removeAllListeners).not.toHaveBeenCalled();
  });

  it("unsubscribe: no token ever registered → no DELETE, still resolves true", async () => {
    const plugin = makePlugin({ permission: "denied" });
    setCapacitor(plugin);

    const outcome = await unsubscribeNativePush(vi.fn());

    expect(outcome).toBe(true);
    expect(fetchCalls).toHaveLength(0);
    // Nothing was ever registered.
    expect(plugin.removeAllListeners).not.toHaveBeenCalled();
    expect(plugin.register).not.toHaveBeenCalled();
  });
});
