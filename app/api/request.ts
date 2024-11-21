export const isJSONRequest = (req: Request) => {
    return req.headers.get("content-type") === "application/json";
}
