import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const insertMock = vi.fn();
const valuesMock = vi.fn();
const returningMock = vi.fn();

insertMock.mockReturnValue({ values: valuesMock });
valuesMock.mockReturnValue({ returning: returningMock });

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: (...args: unknown[]) => findFirstMock(...args),
      },
    },
    insert: (...args: unknown[]) => insertMock(...args),
  },
  users: {
    id: "id-col",
    username: "username-col",
    email: "email-col",
  } as Record<string, unknown>,
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    insertMock.mockClear();
    valuesMock.mockClear();
    returningMock.mockReset();

    insertMock.mockReturnValue({ values: valuesMock });
    valuesMock.mockReturnValue({ returning: returningMock });
  });

  it("creates a user on valid input and returns 201", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);
    returningMock.mockResolvedValueOnce([
      { id: "new-id", username: "jane-doe", email: "jane@example.com" },
    ]);

    const res = await POST(
      makeRequest({
        username: "jane-doe",
        email: "jane@example.com",
        password: "hunter2hunter",
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      user: { id: string; username: string; email: string };
    };
    expect(body.user).toEqual({
      id: "new-id",
      username: "jane-doe",
      email: "jane@example.com",
    });
    expect(valuesMock).toHaveBeenCalledTimes(1);
    const insertedRow = valuesMock.mock.calls[0]?.[0] as {
      username: string;
      email: string;
      hashedPassword: string;
    };
    expect(insertedRow.username).toBe("jane-doe");
    expect(insertedRow.email).toBe("jane@example.com");
    // hashedPassword should be a bcrypt hash, never the plaintext
    expect(insertedRow.hashedPassword).toMatch(/^\$2[aby]\$10\$/);
    expect(insertedRow.hashedPassword).not.toBe("hunter2hunter");
  });

  it("returns 409 when the email is already taken", async () => {
    findFirstMock.mockResolvedValueOnce({
      email: "taken@example.com",
      username: "someone-else",
    });

    const res = await POST(
      makeRequest({
        username: "jane-doe",
        email: "taken@example.com",
        password: "hunter2hunter",
      }),
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/email/i);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the username is already taken", async () => {
    findFirstMock.mockResolvedValueOnce({
      email: "other@example.com",
      username: "taken-username",
    });

    const res = await POST(
      makeRequest({
        username: "taken-username",
        email: "jane@example.com",
        password: "hunter2hunter",
      }),
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/username/i);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 400 on validation errors", async () => {
    const res = await POST(
      makeRequest({
        username: "ab", // too short
        email: "not-an-email",
        password: "short",
      }),
    );

    expect(res.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 if a concurrent insert wins the race (unique_violation)", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);
    returningMock.mockRejectedValueOnce({ code: "23505" });

    const res = await POST(
      makeRequest({
        username: "jane-doe",
        email: "jane@example.com",
        password: "hunter2hunter",
      }),
    );

    expect(res.status).toBe(409);
  });
});
