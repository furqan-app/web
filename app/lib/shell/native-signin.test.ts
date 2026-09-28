import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyNativeSignInError,
  nativeGoogleSignIn,
  nativeSignOut,
  NATIVE_SIGNIN_ERROR_EVENT,
} from "./native-signin";

const mockSocialLogin = {
  initialize: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock("@capgo/capacitor-social-login", () => ({
  SocialLogin: mockSocialLogin,
}));

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

describe("classifyNativeSignInError", () => {
  it("classifies USER_CANCELLED error code as cancelled", () => {
    expect(classifyNativeSignInError({ code: "USER_CANCELLED" })).toBe(
      "cancelled",
    );
  });

  it("classifies GetCredentialCancellationException message as cancelled", () => {
    expect(
      classifyNativeSignInError(
        new Error("GetCredentialCancellationException: User cancelled"),
      ),
    ).toBe("cancelled");
  });

  it("classifies generic errors as failed", () => {
    expect(classifyNativeSignInError(new Error("Network timeout"))).toBe(
      "failed",
    );
    expect(classifyNativeSignInError({ code: "10" })).toBe("failed");
    expect(classifyNativeSignInError(null)).toBe("failed");
    expect(classifyNativeSignInError(undefined)).toBe("failed");
  });
});

describe("nativeGoogleSignIn", () => {
  const assign = vi.fn();
  const reload = vi.fn();
  const dispatchEvent = vi.fn();
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-web-client-id";
    mockSocialLogin.initialize.mockResolvedValue(undefined);

    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/ar/pages/1",
          search: "",
          assign,
          reload,
        },
        dispatchEvent,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("returns signed-in and navigates to target on success", async () => {
    mockSocialLogin.login.mockResolvedValueOnce({
      result: { idToken: "valid-token" },
    });
    mockSignIn.mockResolvedValueOnce({ ok: true });

    const outcome = await nativeGoogleSignIn("/ar/share/verse/2/255");
    expect(outcome).toBe("signed-in");
    expect(mockSocialLogin.login).toHaveBeenCalledWith({
      provider: "google",
      options: {},
    });
    expect(mockSignIn).toHaveBeenCalledWith("google-native", {
      idToken: "valid-token",
      redirect: false,
    });
    expect(assign).toHaveBeenCalledWith("/ar/share/verse/2/255");
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("falls back to current path when target is invalid", async () => {
    mockSocialLogin.login.mockResolvedValueOnce({
      result: { idToken: "valid-token" },
    });
    mockSignIn.mockResolvedValueOnce({ ok: true });

    const outcome = await nativeGoogleSignIn("https://evil.com");
    expect(outcome).toBe("signed-in");
    expect(assign).toHaveBeenCalledWith("/ar/pages/1");
  });

  it("returns failed and dispatches error event when next-auth sign-in fails", async () => {
    mockSocialLogin.login.mockResolvedValueOnce({
      result: { idToken: "valid-token" },
    });
    mockSignIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    const outcome = await nativeGoogleSignIn();
    expect(outcome).toBe("failed");
    expect(assign).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe(NATIVE_SIGNIN_ERROR_EVENT);
  });

  it("returns cancelled and dispatches NO event when login throws a cancel error", async () => {
    mockSocialLogin.login.mockRejectedValueOnce(
      new Error("GetCredentialCancellationException: User cancelled"),
    );

    const outcome = await nativeGoogleSignIn();
    expect(outcome).toBe("cancelled");
    expect(assign).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("returns failed and dispatches error event when login throws a generic error", async () => {
    mockSocialLogin.login.mockRejectedValueOnce(new Error("API_NOT_CONNECTED"));

    const outcome = await nativeGoogleSignIn();
    expect(outcome).toBe("failed");
    expect(assign).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(NATIVE_SIGNIN_ERROR_EVENT);
  });

  it("returns failed when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const outcome = await nativeGoogleSignIn();
    expect(outcome).toBe("failed");
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("initializes with webClientId and only initializes once across multiple successful sign-ins", async () => {
    vi.resetModules();
    const { nativeGoogleSignIn: freshSignIn } = await import("./native-signin");
    mockSocialLogin.login.mockResolvedValue({
      result: { idToken: "valid-token" },
    });
    mockSignIn.mockResolvedValue({ ok: true });

    await freshSignIn();
    expect(mockSocialLogin.initialize).toHaveBeenCalledTimes(1);
    expect(mockSocialLogin.initialize).toHaveBeenCalledWith({
      google: { webClientId: "test-web-client-id" },
    });

    await freshSignIn();
    expect(mockSocialLogin.initialize).toHaveBeenCalledTimes(1);
  });

  it("retries initialize on the next call if initialize rejected previously", async () => {
    vi.resetModules();
    const { nativeGoogleSignIn: freshSignIn } = await import("./native-signin");
    mockSocialLogin.initialize.mockRejectedValueOnce(new Error("Init failed"));
    mockSocialLogin.login.mockResolvedValue({
      result: { idToken: "valid-token" },
    });
    mockSignIn.mockResolvedValue({ ok: true });

    const firstOutcome = await freshSignIn();
    expect(firstOutcome).toBe("failed");
    expect(mockSocialLogin.initialize).toHaveBeenCalledTimes(1);

    mockSocialLogin.initialize.mockResolvedValueOnce(undefined);
    const secondOutcome = await freshSignIn();
    expect(secondOutcome).toBe("signed-in");
    expect(mockSocialLogin.initialize).toHaveBeenCalledTimes(2);
  });
});

describe("nativeSignOut", () => {
  const reload = vi.fn();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { reload },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it("signs out, logs out of SocialLogin, and reloads window", async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    mockSocialLogin.logout.mockResolvedValueOnce(undefined);

    await nativeSignOut();
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockSocialLogin.logout).toHaveBeenCalledWith({ provider: "google" });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
