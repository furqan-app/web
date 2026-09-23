export const isJSONRequest = (req: Request) => {
  return req.headers.get("content-type") === "application/json";
};

export const extractUser = (req: Request) => {
  try {
    const raw = req.headers.get("user");
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed);
    }
    return JSON.parse(decodeURIComponent(trimmed));
  } catch {
    return null;
  }
};
