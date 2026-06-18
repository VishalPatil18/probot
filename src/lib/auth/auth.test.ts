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
  users: {} as Record<string, unknown>,
}));

import { authOptions } from "./auth";
import { hashPassword } from "./passwords";

type AuthorizeFn = (
  credentials: Record<string, string> | undefined,
) => Promise<{ id: string; username: string; email: string } | null>;

function getAuthorize(): AuthorizeFn {
  // NextAuth v4 CredentialsProvider stashes the user-supplied authorize on
  // `.options.authorize`; the top-level `.authorize` is a default `() => null`
  // stub. Reach for the user's function explicitly.
  const provider = authOptions.providers[0] as
    | { options?: { authorize?: AuthorizeFn } }
    | undefined;
  const fn = provider?.options?.authorize;
  if (typeof fn !== "function") {
    throw new Error(
      "Expected Credentials provider with authorize() in options",
    );
  }
  return fn;
}

describe("CredentialsProvider.authorize()", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns the user on valid credentials", async () => {
    const hashed = await hashPassword("hunter2hunter");
    findFirstMock.mockResolvedValueOnce({
      id: "user-id-1",
      username: "jane-doe",
      email: "jane@example.com",
      hashedPassword: hashed,
    });

    const result = await getAuthorize()({
      email: "jane@example.com",
      password: "hunter2hunter",
    });

    expect(result).toEqual({
      id: "user-id-1",
      username: "jane-doe",
      email: "jane@example.com",
    });
  });

  it("returns null when the user is not found", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);

    const result = await getAuthorize()({
      email: "missing@example.com",
      password: "whatever1",
    });

    expect(result).toBeNull();
  });

  it("returns null on an incorrect password", async () => {
    const hashed = await hashPassword("correct-password");
    findFirstMock.mockResolvedValueOnce({
      id: "user-id-1",
      username: "jane-doe",
      email: "jane@example.com",
      hashedPassword: hashed,
    });

    const result = await getAuthorize()({
      email: "jane@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  it("returns null on an invalid credential shape", async () => {
    const result = await getAuthorize()({
      email: "not-an-email",
      password: "",
    });

    expect(result).toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

describe("authOptions", () => {
  it("uses JWT session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("declares a custom sign-in page", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });
});
