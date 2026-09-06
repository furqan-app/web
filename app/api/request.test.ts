import { describe, expect, it } from "vitest";
import { extractUser } from "./request";

describe("extractUser", () => {
  it("decodes percent-encoded user header with Arabic characters", () => {
    const user = {
      id: 42,
      name: "محمد أحمد",
      email: "mohamed@example.com",
    };
    const req = new Request("http://localhost/api/marks", {
      headers: {
        user: encodeURIComponent(JSON.stringify(user)),
      },
    });

    const result = extractUser(req);
    expect(result).toEqual(user);
    expect(result.name).toBe("محمد أحمد");
  });

  it("decodes percent-encoded user header with ASCII characters", () => {
    const user = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
    };
    const req = new Request("http://localhost/api/marks", {
      headers: {
        user: encodeURIComponent(JSON.stringify(user)),
      },
    });

    const result = extractUser(req);
    expect(result).toEqual(user);
  });

  it("handles unencoded raw JSON headers for backwards compatibility", () => {
    const user = {
      id: 10,
      name: "Jane Doe",
      email: "jane@example.com",
    };
    const req = new Request("http://localhost/api/marks", {
      headers: {
        user: JSON.stringify(user),
      },
    });

    const result = extractUser(req);
    expect(result).toEqual(user);
  });

  it("preserves literal percent escapes in unencoded raw JSON without accidental decoding", () => {
    const user = {
      id: 11,
      name: "foo%20bar",
      email: "percent@example.com",
    };
    const req = new Request("http://localhost/api/marks", {
      headers: {
        user: JSON.stringify(user),
      },
    });

    const result = extractUser(req);
    expect(result).toEqual(user);
    expect(result.name).toBe("foo%20bar");
  });

  it("returns null when user header is missing", () => {
    const req = new Request("http://localhost/api/marks");
    const result = extractUser(req);
    expect(result).toBeNull();
  });

  it("returns null when user header is malformed non-JSON", () => {
    const req = new Request("http://localhost/api/marks", {
      headers: {
        user: "not-json-content",
      },
    });

    const result = extractUser(req);
    expect(result).toBeNull();
  });
});

describe("Header ByteString compatibility with non-ASCII tokens", () => {
  it("fails when setting raw Arabic string directly in Headers (reproducing the original bug)", () => {
    const token = {
      id: 42,
      name: "محمد أحمد",
      email: "mohamed@example.com",
    };
    const headers = new Headers();
    expect(() => {
      headers.set("user", JSON.stringify(token));
    }).toThrowError(/ByteString|byte|character|255/i);
  });

  it("succeeds when setting percent-encoded Arabic token in Headers", () => {
    const token = {
      id: 42,
      name: "محمد أحمد",
      email: "mohamed@example.com",
    };
    const headers = new Headers();
    expect(() => {
      headers.set("user", encodeURIComponent(JSON.stringify(token)));
    }).not.toThrow();

    const req = new Request("http://localhost/api/marks", { headers });
    const extracted = extractUser(req);
    expect(extracted).toEqual(token);
    expect(extracted.name).toBe("محمد أحمد");
  });
});
