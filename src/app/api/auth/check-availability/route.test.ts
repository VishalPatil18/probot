import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: (...args: unknown[]) => findFirstMock(...args),
      },
    },
  },
  users: {
    id: "id-col",
    username: "username-col",
    email: "email-col",
  } as Record<string, unknown>,
}));

import { GET } from "./route";

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/auth/check-availability?${query}`);
}

describe("GET /api/auth/check-availability", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("400s when neither username nor email is supplied", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("reports an unused username as available", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);
    const res = await GET(makeRequest("username=jane-doe"));
    const body = await res.json();
    expect(body.username).toEqual({ available: true });
  });

  it("reports a taken username as unavailable with a reason", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "abc" });
    const res = await GET(makeRequest("username=jane-doe"));
    const body = await res.json();
    expect(body.username.available).toBe(false);
    expect(body.username.reason).toMatch(/taken/i);
  });

  it("rejects an invalid username without hitting the database", async () => {
    const res = await GET(makeRequest("username=A"));
    const body = await res.json();
    expect(body.username.available).toBe(false);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("reports a taken email as unavailable", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "abc" });
    const res = await GET(makeRequest("email=taken%40example.com"));
    const body = await res.json();
    expect(body.email.available).toBe(false);
  });

  it("rejects a malformed email without hitting the database", async () => {
    const res = await GET(makeRequest("email=not-an-email"));
    const body = await res.json();
    expect(body.email.available).toBe(false);
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
