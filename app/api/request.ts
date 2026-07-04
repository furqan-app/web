export const isJSONRequest = (req: Request) => {
  return req.headers.get("content-type") === "application/json";
};

export const extractUser = (req: Request) => {
  try {
    return JSON.parse(req.headers.get("user") as string);
  } catch {
    return null;
  }
};
