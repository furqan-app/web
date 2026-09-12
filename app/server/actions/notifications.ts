// NOTE: like the other files in app/server/actions/, these run in the
// BROWSER (no "use server" directive; relative fetch paths; called from
// React Query hooks in client components).

const JSON_HEADERS = { "Content-Type": "application/json" };

export const registerPushSubscription = async (
  subscription: PushSubscriptionJSON
): Promise<boolean> => {
  try {
    const { success } = await fetch("/api/notifications/push-subscription", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(subscription),
    }).then((r) => r.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const unregisterPushSubscription = async (endpoint: string): Promise<boolean> => {
  try {
    const { success } = await fetch("/api/notifications/push-subscription", {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ endpoint }),
    }).then((r) => r.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};
