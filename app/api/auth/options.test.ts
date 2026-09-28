import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => {
  return {
    OAuth2Client: class {
      verifyIdToken = mockVerifyIdToken;
    },
  };
});

vi.mock("@/app/utils/db", () => ({
  appPrisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/fq-logger", () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

import { verifyNativeGoogleIdToken, authOptions } from "./options";
import { appPrisma } from "@/app/utils/db";

describe("verifyNativeGoogleIdToken", () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-web-client-id";
  });

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  });

  it("returns email and name when token is valid and email_verified is true", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "user@example.com",
        name: "Test User",
        email_verified: true,
      }),
    });

    const result = await verifyNativeGoogleIdToken("valid-id-token");
    expect(result).toEqual({
      email: "user@example.com",
      name: "Test User",
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: "valid-id-token",
      audience: "test-web-client-id",
    });
  });

  it("falls back to email for name when payload.name is missing", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "user@example.com",
        email_verified: true,
      }),
    });

    const result = await verifyNativeGoogleIdToken("token-no-name");
    expect(result).toEqual({
      email: "user@example.com",
      name: "user@example.com",
    });
  });

  it("returns null when email_verified is false", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "user@example.com",
        name: "Test User",
        email_verified: false,
      }),
    });

    const result = await verifyNativeGoogleIdToken("unverified-token");
    expect(result).toBe(null);
  });

  it("returns null when payload has no email", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        name: "Test User",
        email_verified: true,
      }),
    });

    const result = await verifyNativeGoogleIdToken("token-without-email");
    expect(result).toBe(null);
  });

  it("returns null when payload is missing", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => null,
    });

    const result = await verifyNativeGoogleIdToken("empty-payload-token");
    expect(result).toBe(null);
  });

  it("returns null when verifyIdToken throws", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(
      new Error("Invalid token signature"),
    );

    const result = await verifyNativeGoogleIdToken("bad-signature-token");
    expect(result).toBe(null);
  });

  it("returns null and does not call verifyIdToken when GOOGLE_CLIENT_ID is unset", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const result = await verifyNativeGoogleIdToken("valid-id-token");
    expect(result).toBe(null);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});

describe("authOptions google-native provider and callbacks", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getNativeAuthorize = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeProvider = authOptions.providers.find((p: any) =>
      p.id === "google-native" || p.options?.id === "google-native",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (nativeProvider as any)?.options?.authorize ?? (nativeProvider as any)?.authorize;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-web-client-id";
  });

  it("includes google-native CredentialsProvider", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeProvider = authOptions.providers.find((p: any) =>
      p.id === "google-native" || p.options?.id === "google-native",
    );
    expect(nativeProvider).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (nativeProvider as any).options?.name ?? (nativeProvider as any).name;
    expect(name).toBe("Google (native)");
  });

  it("authorizes valid native tokens and returns user with string id", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "authorized@example.com",
        name: "Authorized User",
        email_verified: true,
      }),
    });

    (appPrisma.user.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 42,
      name: "Authorized User",
      email: "authorized@example.com",
    });

    const authorize = getNativeAuthorize();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await authorize({ idToken: "valid-token" }, {} as any);

    expect(user).toEqual({
      id: "42",
      name: "Authorized User",
      email: "authorized@example.com",
    });
  });

  it("returns null when idToken is missing without calling verifyIdToken", async () => {
    const authorize = getNativeAuthorize();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await authorize({}, {} as any);

    expect(user).toBe(null);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns null without calling upsert when token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Verification failed"));

    const authorize = getNativeAuthorize();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await authorize({ idToken: "invalid-token" }, {} as any);

    expect(user).toBe(null);
    expect(appPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it("rejects when user upsert rejects", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "authorized@example.com",
        name: "Authorized User",
        email_verified: true,
      }),
    });

    (appPrisma.user.upsert as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Database connection lost"),
    );

    const authorize = getNativeAuthorize();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(authorize({ idToken: "valid-token" }, {} as any)).rejects.toThrow(
      "Database connection lost",
    );
  });

  it("narrows session callback to id, name, email and omits password", async () => {
    (appPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 42,
      name: "Test User",
      email: "user@example.com",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionResult = await authOptions.callbacks?.session?.({
      session: {
        user: { email: "user@example.com" },
        expires: "2099-01-01",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(appPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      select: { id: true, name: true, email: true },
    });
    expect(sessionResult?.user).toEqual({
      id: 42,
      name: "Test User",
      email: "user@example.com",
    });
    expect((sessionResult?.user as Record<string, unknown>).password).toBeUndefined();
  });

  it("jwt callback strips password, created_at, updated_at on success", async () => {
    (appPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 42,
      name: "Test User",
      email: "user@example.com",
    });

    const tokenWithStaleKeys = {
      email: "user@example.com",
      password: "stale_hash",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwtResult = await authOptions.callbacks?.jwt?.({
      token: tokenWithStaleKeys,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(appPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      select: { id: true, name: true, email: true },
    });
    expect(jwtResult?.id).toBe(42);
    expect((jwtResult as Record<string, unknown>).password).toBeUndefined();
    expect((jwtResult as Record<string, unknown>).created_at).toBeUndefined();
    expect((jwtResult as Record<string, unknown>).updated_at).toBeUndefined();
  });

  it("jwt callback strips password when findUnique rejects", async () => {
    (appPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Database error"),
    );

    const tokenWithStaleKeys = {
      email: "user@example.com",
      password: "stale_hash",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwtResult = await authOptions.callbacks?.jwt?.({
      token: tokenWithStaleKeys,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect((jwtResult as Record<string, unknown>).password).toBeUndefined();
    expect((jwtResult as Record<string, unknown>).created_at).toBeUndefined();
    expect((jwtResult as Record<string, unknown>).updated_at).toBeUndefined();
  });
});
