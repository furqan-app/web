import mysql from "mysql2/promise";
import { E2EUser, DEFAULT_E2E_USER } from "./auth";

export const SECONDARY_E2E_USER: E2EUser = {
  id: 2,
  name: "Viewer Student",
  email: "viewer@test.local",
};

export const ANONYMOUS_E2E_USER: E2EUser = {
  id: 3,
  name: "",
  email: "anonymous@test.local",
};

let appDbPool: mysql.Pool | null = null;

export function getAppDbPool(): mysql.Pool {
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
 * Seeds both default and secondary users into the e2e app database.
 */
export async function seedTestUsers(): Promise<void> {
  const pool = getAppDbPool();
  await pool.query(
    `INSERT INTO users (id, name, email, created_at, updated_at) 
     VALUES 
       (?, ?, ?, NOW(), NOW()),
       (?, ?, ?, NOW(), NOW()),
       (?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email)`,
    [
      DEFAULT_E2E_USER.id,
      DEFAULT_E2E_USER.name,
      DEFAULT_E2E_USER.email,
      SECONDARY_E2E_USER.id,
      SECONDARY_E2E_USER.name,
      SECONDARY_E2E_USER.email,
      ANONYMOUS_E2E_USER.id,
      ANONYMOUS_E2E_USER.name,
      ANONYMOUS_E2E_USER.email,
    ]
  );
}

/**
 * Clears all grants, share codes, and marks from the e2e app database.
 */
export async function clearAllGrantsAndCodes(): Promise<void> {
  const pool = getAppDbPool();
  await pool.query("DELETE FROM mushaf_access_grants");
  await pool.query("DELETE FROM mushaf_share_codes");
  await pool.query("DELETE FROM marks");
}

/**
 * Directly creates a MushafAccessGrant in the e2e database for testing.
 */
export async function createE2EGrant(
  grantId: string,
  ownerUser = DEFAULT_E2E_USER.id,
  viewerUser = SECONDARY_E2E_USER.id
): Promise<void> {
  const pool = getAppDbPool();
  await pool.query(
    `INSERT INTO mushaf_access_grants (id, owner_user, viewer_user, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE id=id`,
    [grantId, ownerUser, viewerUser]
  );
}

/**
 * Deletes a MushafAccessGrant to simulate mid-session revocation.
 */
export async function deleteE2EGrant(grantId: string): Promise<void> {
  const pool = getAppDbPool();
  await pool.query("DELETE FROM mushaf_access_grants WHERE id = ?", [grantId]);
}

/**
 * Creates a mark in the e2e database on a specific mushaf.
 */
export async function seedE2EWordMark(
  ownerUser = DEFAULT_E2E_USER.id,
  fromUser = DEFAULT_E2E_USER.id,
  pageNumber = 1,
  location = "1:1:1",
  category = "forgetting",
  comment: string | null = "Owner test mark"
): Promise<void> {
  const pool = getAppDbPool();
  await pool.query(
    `INSERT INTO marks (page_number, from_user, to_user, marked_type, marked_id, category, comment, created_at, updated_at)
     VALUES (?, ?, ?, 'word', ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE category=VALUES(category), comment=VALUES(comment), from_user=VALUES(from_user)`,
    [pageNumber, fromUser, ownerUser, location, category, comment]
  );
}
