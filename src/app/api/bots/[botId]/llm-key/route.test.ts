import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const findUserMock = vi.fn();
const valuesMock = vi.fn();
const onConflictMock = vi.fn();
const insertMock = vi.fn((..._args: unknown[]) => ({ values: valuesMock }));

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => findUserMock(...args) },
    },
    insert: (...args: unknown[]) => insertMock(...args),
  },
  encryptedLlmKeys: { botId: "ek-bot-id-col" } as Record<string, unknown>,
}));

import { KEK_ENV_VAR } from "@/lib/crypto/constants";

import { POST } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };
const VALID_KEY = "azure-key-1234567890";

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/bots/${BOT_ID}/llm-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bots/[botId]/llm-key", () => {
  const ORIGINAL_KEK = process.env[KEK_ENV_VAR];

  beforeEach(() => {
    vi.resetAllMocks();
    insertMock.mockImplementation((..._args: unknown[]) => ({
      values: valuesMock,
    }));
    valuesMock.mockReturnValue({ onConflictDoUpdate: onConflictMock });
    onConflictMock.mockResolvedValue(undefined);
    requireBotOwnerMock.mockResolvedValue({
      ok: true,
      bot: { id: BOT_ID, userId: "user-1" },
      userId: "user-1",
    });
    process.env[KEK_ENV_VAR] = Buffer.from("0".repeat(32), "utf8").toString(
      "base64",
    );
  });

  afterAll(() => {
    if (ORIGINAL_KEK === undefined) {
      delete process.env[KEK_ENV_VAR];
    } else {
      process.env[KEK_ENV_VAR] = ORIGINAL_KEK;
    }
  });

  it("refuses an Azure key without its endpoint (azure_endpoint_required)", async () => {
    findUserMock.mockResolvedValueOnce({ llmProvider: "azure" });
    const res = await POST(makeRequest({ apiKey: VALID_KEY }), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("azure_endpoint_required");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("stores an Azure key with endpoint + apiVersion on the row", async () => {
    findUserMock.mockResolvedValueOnce({ llmProvider: "azure" });
    const res = await POST(
      makeRequest({
        apiKey: VALID_KEY,
        azureEndpoint: "https://res.cognitiveservices.azure.com",
        azureApiVersion: "2025-01-01-preview",
      }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const row = valuesMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.azureEndpoint).toBe("https://res.cognitiveservices.azure.com");
    expect(row.azureApiVersion).toBe("2025-01-01-preview");
    expect(row.ciphertext).toBeDefined();
    expect(JSON.stringify(row)).not.toContain(VALID_KEY);
  });

  it("rejects a non-https Azure endpoint", async () => {
    findUserMock.mockResolvedValueOnce({ llmProvider: "azure" });
    const res = await POST(
      makeRequest({
        apiKey: VALID_KEY,
        azureEndpoint: "http://insecure.example.com",
      }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_failed");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("nulls the azure columns for non-Azure providers even when supplied", async () => {
    findUserMock.mockResolvedValueOnce({ llmProvider: "anthropic" });
    const res = await POST(
      makeRequest({
        apiKey: VALID_KEY,
        azureEndpoint: "https://stray.example.com",
      }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const row = valuesMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.provider).toBe("anthropic");
    expect(row.azureEndpoint).toBeNull();
    expect(row.azureApiVersion).toBeNull();
  });
});
