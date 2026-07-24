import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelfHostedTokens } from "./SelfHostedTokens";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const activeToken = {
  id: "tok-1",
  name: "Default",
  lastSeenAt: null,
  createdAt: "2026-07-20T10:00:00.000Z",
  revokedAt: null,
};

const fetchMock = vi.fn();

describe("SelfHostedTokens", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // Default GET (list) response used on mount unless a test overrides ordering.
    fetchMock.mockResolvedValue(jsonResponse(200, { tokens: [activeToken] }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists existing tokens fetched on mount", async () => {
    render(<SelfHostedTokens botId={BOT_ID} />);
    expect(await screen.findByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/bots/${BOT_ID}/tokens`);
  });

  it("generates a new token and reveals the raw value once", async () => {
    // mount GET → POST (mint) → refresh GET
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { tokens: [activeToken] }))
      .mockResolvedValueOnce(
        jsonResponse(201, { token: { id: "tok-2", rawToken: "pbt_secret_raw" } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { tokens: [activeToken] }));

    const user = userEvent.setup();
    render(<SelfHostedTokens botId={BOT_ID} />);
    await screen.findByText("Default");

    await user.click(
      screen.getByRole("button", { name: /generate new token/i }),
    );

    expect(await screen.findByText("pbt_secret_raw")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall?.[0]).toBe(`/api/bots/${BOT_ID}/tokens`);
  });

  it("revokes a token after confirmation", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { tokens: [activeToken] }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          tokens: [{ ...activeToken, revokedAt: "2026-07-24T00:00:00.000Z" }],
        }),
      );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(<SelfHostedTokens botId={BOT_ID} />);
    await screen.findByText("Default");

    await user.click(screen.getByRole("button", { name: /^revoke$/i }));

    await waitFor(() => {
      const del = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "DELETE",
      );
      expect(del?.[0]).toBe(`/api/bots/${BOT_ID}/tokens/tok-1`);
    });
    expect(await screen.findByText("Revoked")).toBeInTheDocument();
  });

  it("does not revoke when confirmation is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<SelfHostedTokens botId={BOT_ID} />);
    await screen.findByText("Default");

    await user.click(screen.getByRole("button", { name: /^revoke$/i }));

    const del = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === "DELETE",
    );
    expect(del).toBeUndefined();
  });
});
