export type GrantUser = {
  id: number;
  name: string;
} | null;

export type GrantSummary = {
  grantId: string;
  user: GrantUser;
  created_at: string;
};

export type AccessGrants = {
  accessible: GrantSummary[];
  viewers: GrantSummary[];
};

/** Fetch both directions of the caller's access relationships. */
export const getAccessGrants = async (): Promise<AccessGrants> => {
  try {
    const { data, success }: { data: AccessGrants; success: boolean } =
      await fetch("/api/mushaf/grants", {
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());

    if (!success || !data) return { accessible: [], viewers: [] };
    return data;
  } catch (e) {
    console.error(e);
    return { accessible: [], viewers: [] };
  }
};

/** Request a new one-time share code for the caller's mushaf from the API. */
export const requestShareCode = async (): Promise<string | null> => {
  try {
    const { data, success }: { data: { code: string } | null; success: boolean } =
      await fetch("/api/mushaf/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());

    return success && data ? data.code : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export type RedeemResult =
  | { ok: true; grantId: string }
  | { ok: false; message: string };

/** Redeem a share code. Returns the new grant id on success, else a message. */
export const redeemShareCode = async (code: string): Promise<RedeemResult> => {
  try {
    const res = await fetch("/api/mushaf/codes/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then((r) => r.json());

    if (res.success && res.data?.grantId) {
      return { ok: true, grantId: res.data.grantId };
    }
    return { ok: false, message: res.message ?? "Something went wrong" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Something went wrong" };
  }
};

/** Revoke an access grant (owner removing a viewer, or viewer dropping self). */
export const revokeGrant = async (grantId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/mushaf/grants/${grantId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());

    return !!res.success;
  } catch (e) {
    console.error(e);
    return false;
  }
};
