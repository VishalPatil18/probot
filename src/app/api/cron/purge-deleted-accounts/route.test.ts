import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runPurgeJobMock = vi.fn();
vi.mock("@/lib/account/delete", () => ({
  runPurgeJob: (...args: unknown[]) => runPurgeJobMock(...args),
}));

vi.mock("@/lib/account/prune-audit-log", () => ({
  pruneOldAuditLogs: vi.fn().mockResolvedValue({ deleted: 0 }),
}));

vi.mock("@/lib/auth/email", () => ({
  sendDeletionCompleteEmail: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "./route";

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/purge-deleted-accounts", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/purge-deleted-accounts", () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    runPurgeJobMock.mockReset().mockResolvedValue({
      purgedCount: 0,
      completionEmailsSent: 0,
      rowsCleanedUp: 0,
    });
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = ORIGINAL_SECRET;
    }
  });

  it("503s when CRON_SECRET is not configured (fail-closed)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer anything"));
    expect(res.status).toBe(503);
    expect(runPurgeJobMock).not.toHaveBeenCalled();
  });

  it("401s when the Authorization header is missing", async () => {
    process.env.CRON_SECRET = "abc-secret";
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(runPurgeJobMock).not.toHaveBeenCalled();
  });

  it("401s when the Authorization bearer does not match CRON_SECRET", async () => {
    process.env.CRON_SECRET = "abc-secret";
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(runPurgeJobMock).not.toHaveBeenCalled();
  });

  it("runs the purge job and returns its counts on a valid request", async () => {
    process.env.CRON_SECRET = "abc-secret";
    runPurgeJobMock.mockResolvedValueOnce({
      purgedCount: 3,
      completionEmailsSent: 3,
      rowsCleanedUp: 1,
    });
    const res = await GET(makeRequest("Bearer abc-secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      purgedCount: number;
      completionEmailsSent: number;
      rowsCleanedUp: number;
    };
    expect(body).toEqual({
      ok: true,
      purgedCount: 3,
      completionEmailsSent: 3,
      rowsCleanedUp: 1,
    });
    expect(runPurgeJobMock).toHaveBeenCalledTimes(1);
  });
});
