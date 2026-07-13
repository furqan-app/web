import { appPrisma } from "@/app/utils/db";
import { Mark } from "@/app/generated/app-client";

/**
 * Load an access grant only if it belongs to `viewerId`. The grant id travels
 * in the URL and is NOT a capability — every grant-scoped endpoint must call
 * this so a guessed id can't unlock another user's mushaf (see ADR 0012).
 */
export const getGrantForViewer = async (grantId: string, viewerId: number) => {
  const grant = await appPrisma.mushafAccessGrant.findUnique({
    where: { id: grantId },
  });

  if (!grant || grant.viewer_user !== viewerId) return null;

  return grant;
};

export type MarkWithAuthor = Mark & {
  author_name: string | null;
  is_own: boolean;
};

/**
 * Enrich a page's marks with their author's display name and an `is_own` flag,
 * so any viewer can see who made each mark without needing their own id on the
 * client. `viewerId` is the authenticated user reading the marks. Author lookup
 * is a same-domain query (User + Mark both live in furqan_app) — no cross-domain
 * relation is introduced (ADR 0008).
 */
export const withAuthorNames = async (
  marks: Mark[],
  viewerId: number
): Promise<MarkWithAuthor[]> => {
  // Only resolve names for FOREIGN authors. The common self-only page (every
  // author is the viewer) needs no extra query — own marks render via `is_own`,
  // never `author_name` (see QuranSafha's `authorName` prop to MarkModal),
  // so their name is left null. This keeps the self-marks GET (hit on every
  // page turn) a single query.
  const foreignIds = Array.from(
    new Set(marks.map((m) => m.from_user).filter((id) => id !== viewerId))
  );

  const authors = foreignIds.length
    ? await appPrisma.user.findMany({
        where: { id: { in: foreignIds } },
        select: { id: true, name: true },
      })
    : [];

  const nameById = new Map(authors.map((a) => [a.id, a.name]));

  return marks.map((mark) => ({
    ...mark,
    author_name: nameById.get(mark.from_user) ?? null,
    is_own: mark.from_user === viewerId,
  }));
};

/** Body shape shared by the self and grant-scoped marks write paths. */
type MarkBody = {
  marked_type?: string;
  marked_id?: string;
  category?: string;
  comment?: string | null;
};

/**
 * Upsert a mark on `toUser`'s mushaf, attributed to `fromUser`. A mark is one
 * row = a required `category` + an optional `comment` (ADR 0025). Returns
 * `false` when a required field is missing (the caller emits its own 422). The
 * mark's unique key is page-independent, so `page` is used only when creating a
 * new row. Shared by the self and grant-scoped marks routes so the write path
 * can't drift.
 */
export const upsertMark = async (
  toUser: number,
  fromUser: number,
  page: number,
  body: MarkBody
): Promise<boolean> => {
  const { marked_type, marked_id, category } = body;
  if (!marked_type || !marked_id || !category) return false;

  // Trim to null so a blank comment never persists an empty string.
  const comment = body.comment?.trim() ? body.comment.trim() : null;

  await appPrisma.mark.upsert({
    where: {
      marked_type_marked_id_to_user: {
        to_user: toUser,
        marked_type,
        marked_id,
      },
    },
    update: { from_user: fromUser, category, comment },
    create: {
      page_number: page,
      marked_type,
      marked_id,
      category,
      comment,
      from_user: fromUser,
      to_user: toUser,
    },
  });

  return true;
};

/**
 * Delete a mark on `toUser`'s mushaf by its page-independent unique key. Returns
 * `false` when a required field is missing (the caller emits its own 422).
 */
export const deleteMark = async (
  toUser: number,
  body: MarkBody
): Promise<boolean> => {
  const { marked_type, marked_id } = body;
  if (!marked_type || !marked_id) return false;

  await appPrisma.mark.deleteMany({
    where: { to_user: toUser, marked_type, marked_id },
  });

  return true;
};
