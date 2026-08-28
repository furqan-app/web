import { type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import mysql from "mysql2/promise";

export interface E2EUser {
  id: number;
  name: string;
  email: string;
}

export const DEFAULT_E2E_USER: E2EUser = {
  id: 1,
  name: "E2E Test User",
  email: "e2e@test.local",
};

/**
 * Authenticates a Playwright BrowserContext by setting the signed NextAuth session JWT cookie.
 */
export async function authenticateAsUser(
  context: BrowserContext,
  user: Partial<E2EUser> = {}
): Promise<string> {
  const mergedUser: E2EUser = { ...DEFAULT_E2E_USER, ...user };
  const secret =
    process.env.NEXTAUTH_SECRET || "e2e-test-secret-not-used-in-production";

  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET environment variable is required to authenticate in E2E tests."
    );
  }

  const sessionToken = await encode({
    token: {
      name: mergedUser.name,
      email: mergedUser.email,
      id: mergedUser.id,
      sub: String(mergedUser.id),
    },
    secret,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  return sessionToken;
}

/**
 * Clears authentication cookies from the BrowserContext.
 */
export async function clearAuth(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

let appDbPool: mysql.Pool | null = null;

function getAppDbPool(): mysql.Pool {
  if (!appDbPool) {
    const appDbUrl =
      process.env.APP_DATABASE_URL ||
      "mysql://app_user:app_password@localhost:3310/furqan_app_e2e";
    const u = new URL(appDbUrl);
    appDbPool = mysql.createPool({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return appDbPool;
}

/**
 * Clears all marks for a given user from the e2e app database to isolate test cases.
 */
export async function clearUserMarks(userId = 1): Promise<void> {
  const pool = getAppDbPool();
  await pool.query("DELETE FROM marks WHERE to_user = ?", [userId]);
}
