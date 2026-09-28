import { isSafeLocalePath } from "./app-links";

export type NativeSignInOutcome = "signed-in" | "cancelled" | "failed";

export const NATIVE_SIGNIN_ERROR_EVENT = "fq:native-signin-error";

// Pure: maps a thrown plugin error to cancelled vs failed.
export function classifyNativeSignInError(
  err: unknown,
): "cancelled" | "failed" {
  if (!err) return "failed";
  let message = "";
  let code = "";
  if (typeof err === "object") {
    const rec = err as Record<string, unknown>;
    if (typeof rec.message === "string") message = rec.message;
    if (typeof rec.code === "string" || typeof rec.code === "number") {
      code = String(rec.code);
    }
  } else if (typeof err === "string") {
    message = err;
  }
  const text = `${message} ${code}`.toLowerCase();
  return text.includes("cancel") ? "cancelled" : "failed";
}

let initPromise: Promise<void> | null = null;

function notifyFailed(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NATIVE_SIGNIN_ERROR_EVENT));
  }
}

function sanitizeTarget(target?: string): string {
  const current =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";
  if (!target || typeof target !== "string") return current;
  if (!isSafeLocalePath(target)) {
    return current;
  }
  return target;
}

export async function nativeGoogleSignIn(
  target?: string,
): Promise<NativeSignInOutcome> {
  try {
    const webClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!webClientId) {
      notifyFailed();
      return "failed";
    }

    const { SocialLogin } = await import("@capgo/capacitor-social-login");

    if (!initPromise) {
      initPromise = SocialLogin.initialize({
        google: { webClientId },
      }).catch((err) => {
        initPromise = null;
        throw err;
      });
    }
    await initPromise;

    const res = (await SocialLogin.login({
      provider: "google",
      options: {},
    })) as { result?: { idToken?: string } };

    const idToken = res?.result?.idToken;
    if (!idToken || typeof idToken !== "string") {
      notifyFailed();
      return "failed";
    }

    const { signIn } = await import("next-auth/react");
    const r = await signIn("google-native", { idToken, redirect: false });
    if (!r?.ok || r.error) {
      notifyFailed();
      return "failed";
    }

    if (typeof window !== "undefined") {
      window.location.assign(sanitizeTarget(target));
    }
    return "signed-in";
  } catch (err) {
    const outcome = classifyNativeSignInError(err);
    if (outcome === "failed") {
      notifyFailed();
    }
    return outcome;
  }
}

export async function nativeSignOut(): Promise<void> {
  try {
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
  } catch {}
  try {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    await SocialLogin.logout({ provider: "google" });
  } catch {}
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}
