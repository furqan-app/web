import { test, expect, type Page, type BrowserContext, type TestInfo } from "@playwright/test";
import {
  waitForReaderContent,
  getActivePanel,
  clearLocalMarksStore,
  openWordMarkModal,
  withStandaloneDisplayMode,
  waitForServiceWorker,
  getLocalMark,
} from "../helpers/reader";
import {
  authenticateAsUser,
  clearAuth,
  clearUserMarks,
} from "../helpers/auth";
import { seedTestUsers } from "../helpers/mushaf";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await seedTestUsers([DESKTOP_MARKS_USER, MOBILE_MARKS_USER]);
});

/**
 * Dedicated users per project (ids 11/12 — 1/2/3 belong to the shared
 * DEFAULT/SECONDARY/ANONYMOUS users). Desktop and mobile projects run in
 * parallel workers against one e2e database, and every test here seeds and
 * wipes server marks; sharing one user would let a parallel worker's wipe
 * delete the rows this worker just synced. Rows are seeded via
 * `seedTestUsers` below — required, not optional: the session callback
 * resolves `session.user` (including `id`) from the users table, and without
 * a row the session carries no id so MarksSync never stamps the owner.
 */
const DESKTOP_MARKS_USER = {
  id: 11,
  name: "E2E Marks Page Desktop",
  email: "e2e-marks-page-desktop@test.local",
};
const MOBILE_MARKS_USER = {
  id: 12,
  name: "E2E Marks Page Mobile",
  email: "e2e-marks-page-mobile@test.local",
};

function projectUser(testInfo: TestInfo) {
  return testInfo.project.name === "mobile" ? MOBILE_MARKS_USER : DESKTOP_MARKS_USER;
}

/**
 * Page-level offline coverage for the SELF `/marks` page (#592, epic #590).
 *
 * The engine-level offline paths (store reads, tombstone deletes, reconnect sync)
 * are covered in `word-marking.spec.ts`; these specs prove the *page* works with
 * zero connection: the static shell serves offline (#591), the list/filters/grouping
 * render from the local store, deletes tombstone in place, and guest gating holds.
 * Runs against the production build (`e2e:serve`), never `next dev` — Serwist is
 * disabled in dev so offline shells only exist on the built server.
 */

async function setupMarksSession(
  page: Page,
  context: BrowserContext,
  e2eUser: { id: number; name: string; email: string }
) {
  await clearUserMarks(e2eUser.id);
  await authenticateAsUser(context, e2eUser);
  await clearLocalMarksStore(page);
  await page.goto("/ar/pages/1");
  await waitForReaderContent(page);
  // SW control is required before going offline — the /marks shell is served
  // from the precache only by the active worker (#591).
  await waitForServiceWorker(page);
}

async function markWord(
  page: Page,
  wordDataQ: string,
  labelFor: string,
  saveName: string,
  isMobile: boolean
) {
  const word = getActivePanel(page).locator(`[data-fq-word="${wordDataQ}"]`).first();
  await expect(word).toBeVisible();
  await openWordMarkModal(page, word, isMobile);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator(`label[for="${labelFor}"]`).click();
  await dialog.getByRole("button", { name: saveName }).click();
  await expect(dialog).toBeHidden();
}

async function goOffline(page: Page, context: BrowserContext) {
  await context.setOffline(true);
  // notify the app's online-status hook; real network is already cut above
  await page.evaluate(() => window.dispatchEvent(new Event("offline"))).catch(() => {});
}

/**
 * Requires the MarksSync owner stamp before the network goes: offline gating
 * reads the stamp, not the live session, and the stamp lands in an effect
 * after useSession resolves — so a slow first mount can leave it unset while
 * modal marking (live session) already works. On timeout, throws with a
 * diagnostic dump (stamp, stored mark keys, live session body) so the next
 * failure names its cause instead of just showing a null.
 */
async function requireOwnerStamp(
  page: Page,
  e2eUser: { id: number; name: string; email: string }
) {
  const want = JSON.stringify(String(e2eUser.id));
  const deadline = Date.now() + 20000;
  for (;;) {
    const stamp = await page.evaluate(() =>
      window.localStorage.getItem("localMarksOwner")
    );
    if (stamp === want) return;
    if (Date.now() > deadline) {
      const diag = await page
        .evaluate(async () => {
          let session: unknown;
          try {
            session = await (await fetch("/api/auth/session")).json();
          } catch (err) {
            session = `fetch-failed: ${String(err)}`;
          }
          let markKeys: string[] | string = [];
          try {
            markKeys = Object.keys(
              JSON.parse(window.localStorage.getItem("localMarks") ?? "{}")
            );
          } catch (err) {
            markKeys = `parse-failed: ${String(err)}`;
          }
          return {
            owner: window.localStorage.getItem("localMarksOwner"),
            markKeys,
            session,
          };
        })
        .catch((err) => `evaluate-failed: ${String(err)}`);
      throw new Error(
        `owner stamp never landed for user ${e2eUser.id}; diag: ${JSON.stringify(diag)}`
      );
    }
    await page.waitForTimeout(500);
  }
}

async function goOnline(page: Page, context: BrowserContext) {
  await context.setOffline(false);
  await page.evaluate(() => {
    if (navigator.onLine) {
      window.dispatchEvent(new Event("online"));
    }
  }).catch(() => {});
}

test.describe("My Marks page offline (read plus local-first delete)", () => {
  test("offline /marks renders seeded marks with filters and grouping, no network", async ({
    page,
    context,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";
    await setupMarksSession(page, context, projectUser(testInfo));

    await markWord(page, "1:1:1", "mark-color-forgetting", "حفظ: نسيان", isMobile);
    await markWord(page, "1:1:2", "mark-color-linking", "حفظ: تربيط", isMobile);

    // Store holds both records (pending is enough — the store is the read truth).
    await expect
      .poll(async () => await getLocalMark(page, "word:1:1:1"), { timeout: 10000 })
      .not.toBeNull();
    await expect
      .poll(async () => await getLocalMark(page, "word:1:1:2"), { timeout: 10000 })
      .not.toBeNull();

    // Fresh authenticated mount replays session resolve + stamp from first
    // principles in case the first mount's effect ordering slipped under load,
    // then require the stamp: offline gating reads it, not the live session.
    await page.reload();
    await waitForReaderContent(page);
    await requireOwnerStamp(page, projectUser(testInfo));

    // Zero connection from here on.
    await goOffline(page, context);

    // The static shell must serve with no network (#591).
    await page.goto("/ar/marks");
    await expect(page.locator("main")).toBeVisible();

    // List renders from the local store: title, surah group, both rows.
    await expect(page.getByRole("heading", { name: "علاماتي" })).toBeVisible();
    await expect(page.getByText("الفاتحة").first()).toBeVisible({ timeout: 10000 });
    const rows = page.locator('main a[href$="/pages/1"]');
    await expect(rows).toHaveCount(2);

    // Signed-in owner sees the store offline — never the sign-in prompt.
    await expect(page.getByText("سجّل الدخول لرؤية علاماتك.")).toBeHidden();

    // Sync banners stay quiet offline: nothing failed, nothing to surface.
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);

    // Category filters are present and work with no network.
    if (isMobile) {
      await expect(page.getByRole("button", { name: "تصفية العلامات" })).toBeVisible();
      await page.getByRole("button", { name: "تصفية العلامات" }).click();
      await page.getByRole("menuitem", { name: /تربيط/ }).click();
    } else {
      await expect(page.getByRole("button", { name: "الكل" })).toBeVisible();
      await page.getByRole("button", { name: "تربيط" }).click();
    }
    await expect(page.locator('main a[href$="/pages/1"]')).toHaveCount(1);

    await context.setOffline(false);
  });

  test("offline delete on /marks tombstones, survives reload, syncs on reconnect", async ({
    page,
    context,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";
    await setupMarksSession(page, context, projectUser(testInfo));

    await markWord(
      page,
      "1:1:1",
      "mark-color-forgetting",
      "حفظ: نسيان",
      isMobile
    );

    // Ensure the server holds the mark so the reconnect delete is meaningful.
    await expect
      .poll(async () => (await getLocalMark(page, "word:1:1:1"))?.sync, {
        timeout: 15000,
      })
      .toBe("synced");

    await page.goto("/ar/marks");
    const row = page.locator('main a[href$="/pages/1"]');
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    await goOffline(page, context);

    // Delete in place: the row disappears immediately (tombstone, no reload).
    await page.getByRole("button", { name: "إزالة العلامة" }).first().click();
    await expect(page.locator('main a[href$="/pages/1"]')).toHaveCount(0);

    const tombstone = await getLocalMark(page, "word:1:1:1");
    expect(tombstone?.deleted).toBe(true);
    expect(tombstone?.sync).toBe("pending");

    // Reload while still offline — the row stays gone, no prompt, no banners.
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('main a[href$="/pages/1"]')).toHaveCount(0);
    await expect(page.getByText("سجّل الدخول لرؤية علاماتك.")).toBeHidden();
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);

    // Reconnect — the push deletes server-side and the tombstone is dropped.
    await goOnline(page, context);
    await expect
      .poll(async () => await getLocalMark(page, "word:1:1:1"), {
        timeout: 15000,
      })
      .toBeNull();

    // The delete persisted: a fresh pull does not resurrect the mark.
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('main a[href$="/pages/1"]')).toHaveCount(0);
  });

  test("installed-PWA guest sees own marks on /marks while offline", async ({
    page,
    context,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";
    await withStandaloneDisplayMode(page);
    await clearAuth(context);
    await clearLocalMarksStore(page);
    await page.goto("/ar/pages/1");
    await waitForReaderContent(page);
    await waitForServiceWorker(page);

    // Guest marks with no connection and no account.
    await goOffline(page, context);
    await markWord(page, "1:1:1", "mark-color-forgetting", "حفظ: نسيان", isMobile);
    await expect
      .poll(async () => await getLocalMark(page, "word:1:1:1"), { timeout: 10000 })
      .not.toBeNull();

    // The guest's own marks render offline — no sign-in wall in the PWA.
    await page.goto("/ar/marks");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("الفاتحة").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("سجّل الدخول لرؤية علاماتك.")).toBeHidden();

    await context.setOffline(false);
  });
});
