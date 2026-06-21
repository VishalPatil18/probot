import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock state lives at module scope so the per-test reset can wire fresh
// behavior into each closure. The chained Drizzle builders (`.where()`
// `.returning()`) are stubbed by returning thenables / chainables.
const findUserMock = vi.fn();
const findDeletionMock = vi.fn();
const findManyDeletionMock = vi.fn();
const insertValuesMock = vi.fn();
const updateSetWhereMock = vi.fn();
const deleteUsersWhereMock = vi.fn();
const deleteDeletionByIdWhereMock = vi.fn();
const deleteDeletionByConditionReturningMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => findUserMock(...args) },
      // Single shared mock - tests configure findDeletionMock per-case
      // since both initiate (where: user_id) and undo (where: token_hash)
      // call this with one resolved value at a time.
      deletionRequests: {
        findFirst: (...args: unknown[]) => findDeletionMock(...args),
        findMany: (...args: unknown[]) => findManyDeletionMock(...args),
      },
    },
    insert: () => ({
      values: (...args: unknown[]) => insertValuesMock(...args),
    }),
    update: () => ({
      set: () => ({
        where: (...args: unknown[]) => updateSetWhereMock(...args),
      }),
    }),
    delete: (table: unknown) => ({
      where: (...args: unknown[]) => {
        if (table === "users-table") return deleteUsersWhereMock(...args);
        return {
          returning: (...rArgs: unknown[]) =>
            deleteDeletionByConditionReturningMock(...rArgs),
          // chain for the by-id delete (no `.returning()`):
          then: (resolve: (v: unknown) => unknown) =>
            resolve(deleteDeletionByIdWhereMock(...args)),
        };
      },
    }),
  },
  users: "users-table" as unknown as Record<string, unknown>,
  deletionRequests: {
    userId: "dr-user-id",
    undoTokenHash: "dr-undo-token-hash",
    scheduledPurgeAt: "dr-scheduled",
    purgedAt: "dr-purged",
    id: "dr-id",
  } as unknown as Record<string, unknown>,
}));

vi.mock("@/lib/auth/tokens", () => ({
  generateRawToken: () => "raw-token-fixture-1234567890abcdef-fixture",
  hashToken: (raw: string) => `hash(${raw})`,
}));

import {
  initiateAccountDeletion,
  runPurgeJob,
  undoAccountDeletion,
} from "./delete";

describe("initiateAccountDeletion", () => {
  beforeEach(() => {
    findUserMock.mockReset();
    findDeletionMock.mockReset().mockResolvedValue(undefined);
    findDeletionMock.mockReset();
    insertValuesMock.mockReset();
    updateSetWhereMock.mockReset();
  });

  it("returns user_not_found when the user row is gone", async () => {
    findUserMock.mockResolvedValueOnce(undefined);
    const result = await initiateAccountDeletion("u1", "anything");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("user_not_found");
  });

  it("returns username_mismatch when typed username doesn't match the live row", async () => {
    findUserMock.mockResolvedValueOnce({
      id: "u1",
      username: "real-name",
      email: "real@example.com",
    });
    const result = await initiateAccountDeletion("u1", "wrong-name");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("username_mismatch");
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("returns already_requested when a deletion is already pending", async () => {
    findUserMock.mockResolvedValueOnce({
      id: "u1",
      username: "real-name",
      email: "real@example.com",
    });
    findDeletionMock.mockResolvedValueOnce({ id: "dr-1" });
    const result = await initiateAccountDeletion("u1", "real-name");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("already_requested");
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("creates a deletion row with a 7-day-out scheduled purge and returns the raw token", async () => {
    findUserMock.mockResolvedValueOnce({
      id: "u1",
      username: "jane-doe",
      email: "jane@example.com",
    });
    findDeletionMock.mockResolvedValueOnce(undefined);

    const beforeTs = Date.now();
    const result = await initiateAccountDeletion("u1", "jane-doe");
    const afterTs = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rawUndoToken).toBe(
      "raw-token-fixture-1234567890abcdef-fixture",
    );
    expect(result.emailSnapshot).toBe("jane@example.com");

    // 7-day grace ± some clock slop.
    const expectedMin = beforeTs + 7 * 24 * 60 * 60 * 1000;
    const expectedMax = afterTs + 7 * 24 * 60 * 60 * 1000;
    expect(result.scheduledPurgeAt.getTime()).toBeGreaterThanOrEqual(
      expectedMin,
    );
    expect(result.scheduledPurgeAt.getTime()).toBeLessThanOrEqual(
      expectedMax,
    );

    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    const row = insertValuesMock.mock.calls[0]?.[0] as {
      userId: string;
      emailSnapshot: string;
      usernameSnapshot: string;
      undoTokenHash: string;
      confirmationUsername: string;
    };
    expect(row.userId).toBe("u1");
    expect(row.emailSnapshot).toBe("jane@example.com");
    expect(row.usernameSnapshot).toBe("jane-doe");
    expect(row.confirmationUsername).toBe("jane-doe");
    // The undo token in the row must be the HASH, never the raw value.
    expect(row.undoTokenHash).toBe(
      "hash(raw-token-fixture-1234567890abcdef-fixture)",
    );
  });
});

describe("undoAccountDeletion", () => {
  beforeEach(() => {
    findUserMock.mockReset();
    findDeletionMock.mockReset();
    findDeletionMock.mockReset();
    deleteDeletionByIdWhereMock.mockReset();
  });

  it("returns not_found when the token doesn't match any row", async () => {
    findDeletionMock.mockResolvedValueOnce(undefined);
    const result = await undoAccountDeletion("bad-token", "anything");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });

  it("returns already_purged when the row's purged_at is set", async () => {
    findDeletionMock.mockResolvedValueOnce({
      id: "dr-1",
      userId: "u1",
      usernameSnapshot: "jane-doe",
      purgedAt: new Date(),
    });
    const result = await undoAccountDeletion("token", "jane-doe");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("already_purged");
  });

  it("returns username_mismatch when the typed username doesn't match", async () => {
    findDeletionMock.mockResolvedValueOnce({
      id: "dr-1",
      userId: "u1",
      usernameSnapshot: "real-name",
      purgedAt: null,
    });
    const result = await undoAccountDeletion("token", "wrong-name");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("username_mismatch");
    expect(deleteDeletionByIdWhereMock).not.toHaveBeenCalled();
  });

  it("deletes the deletion row and returns ok on the happy path", async () => {
    findDeletionMock.mockResolvedValueOnce({
      id: "dr-1",
      userId: "u1",
      usernameSnapshot: "jane-doe",
      purgedAt: null,
    });
    const result = await undoAccountDeletion("token", "jane-doe");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe("u1");
  });
});

describe("runPurgeJob", () => {
  beforeEach(() => {
    findManyDeletionMock.mockReset();
    updateSetWhereMock.mockReset().mockResolvedValue(undefined);
    deleteUsersWhereMock.mockReset().mockResolvedValue(undefined);
    deleteDeletionByConditionReturningMock
      .mockReset()
      .mockResolvedValue([]);
  });

  it("purges no users when nothing is due", async () => {
    findManyDeletionMock.mockResolvedValueOnce([]);
    const sendCompletionEmail = vi.fn();
    const pruneAuditLogs = vi.fn().mockResolvedValue(undefined);
    const result = await runPurgeJob({
      sendCompletionEmail,
      pruneAuditLogs,
    });
    expect(result.purgedCount).toBe(0);
    expect(result.completionEmailsSent).toBe(0);
    expect(sendCompletionEmail).not.toHaveBeenCalled();
    expect(pruneAuditLogs).toHaveBeenCalledTimes(1);
  });

  it("purges due users, sends completion emails, and counts both", async () => {
    findManyDeletionMock.mockResolvedValueOnce([
      {
        id: "dr-1",
        userId: "u1",
        emailSnapshot: "alice@example.com",
        usernameSnapshot: "alice",
        purgedAt: null,
      },
      {
        id: "dr-2",
        userId: "u2",
        emailSnapshot: "bob@example.com",
        usernameSnapshot: "bob",
        purgedAt: null,
      },
    ]);
    const sendCompletionEmail = vi.fn().mockResolvedValue(undefined);
    const result = await runPurgeJob({
      sendCompletionEmail,
      pruneAuditLogs: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.purgedCount).toBe(2);
    expect(result.completionEmailsSent).toBe(2);
    expect(sendCompletionEmail).toHaveBeenCalledWith({
      to: "alice@example.com",
      username: "alice",
    });
    expect(sendCompletionEmail).toHaveBeenCalledWith({
      to: "bob@example.com",
      username: "bob",
    });
  });

  it("skips rows whose purged_at is already set", async () => {
    findManyDeletionMock.mockResolvedValueOnce([
      {
        id: "dr-1",
        userId: "u1",
        emailSnapshot: "a@x.com",
        usernameSnapshot: "a",
        purgedAt: new Date(),
      },
    ]);
    const sendCompletionEmail = vi.fn();
    const result = await runPurgeJob({
      sendCompletionEmail,
      pruneAuditLogs: vi.fn().mockResolvedValue(undefined),
    });
    expect(result.purgedCount).toBe(0);
    expect(sendCompletionEmail).not.toHaveBeenCalled();
  });

  it("doesn't roll back the purge when the completion email fails", async () => {
    findManyDeletionMock.mockResolvedValueOnce([
      {
        id: "dr-1",
        userId: "u1",
        emailSnapshot: "a@x.com",
        usernameSnapshot: "a",
        purgedAt: null,
      },
    ]);
    const sendCompletionEmail = vi.fn().mockRejectedValue(new Error("smtp"));
    const result = await runPurgeJob({
      sendCompletionEmail,
      pruneAuditLogs: vi.fn().mockResolvedValue(undefined),
    });
    expect(result.purgedCount).toBe(1);
    expect(result.completionEmailsSent).toBe(0);
    // The user delete still ran.
    expect(deleteUsersWhereMock).toHaveBeenCalledTimes(1);
  });
});
