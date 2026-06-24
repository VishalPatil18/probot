import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeployTab } from "./DeployTab";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // Default: token list load returns empty.
  fetchMock.mockResolvedValue(jsonResponse({ tokens: [] }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeployTab", () => {
  it("shows both deployment-mode cards", async () => {
    render(
      <DeployTab botId="bot-1" ownerUsername="vishal" initialMode="managed" />,
    );
    expect(
      screen.getByRole("button", { name: /managed/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /self-hosted/i }),
    ).toBeInTheDocument();
  });

  it("reveals the token section only in self-hosted mode", async () => {
    render(
      <DeployTab
        botId="bot-1"
        ownerUsername="vishal"
        initialMode="self_hosted"
      />,
    );
    expect(
      await screen.findByRole("button", { name: /generate token/i }),
    ).toBeInTheDocument();
  });

  it("mints a token and shows the secret exactly once", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ id: "tok-1", name: "Prod", token: "pbt_secret123" }),
        );
      }
      return Promise.resolve(jsonResponse({ tokens: [] }));
    });

    render(
      <DeployTab
        botId="bot-1"
        ownerUsername="vishal"
        initialMode="self_hosted"
      />,
    );

    await user.type(screen.getByPlaceholderText(/vercel production/i), "Prod");
    await user.click(screen.getByRole("button", { name: /generate token/i }));

    await waitFor(() =>
      expect(screen.getByText(/copy your token now/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("pbt_secret123")).toBeInTheDocument();
  });
});
