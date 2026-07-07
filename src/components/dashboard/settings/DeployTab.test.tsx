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
  fetchMock.mockResolvedValue(jsonResponse({ tokens: [] }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeployTab", () => {
  it("shows the managed status card for managed bots", () => {
    render(
      <DeployTab
        botId="bot-1"
        botName="Ada"
        ownerUsername="vishal"
        mode="managed"
      />,
    );
    expect(screen.getByText(/managed by pro-bot\.dev/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate token/i }),
    ).not.toBeInTheDocument();
  });

  it("reveals tokens + npm snippet for self-hosted bots", async () => {
    render(
      <DeployTab
        botId="bot-1"
        botName="Ada"
        ownerUsername="vishal"
        mode="self_hosted"
      />,
    );
    expect(
      await screen.findByRole("button", { name: /generate token/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/probot-self-hosted/i)).toBeInTheDocument();
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
        botName="Ada"
        ownerUsername="vishal"
        mode="self_hosted"
      />,
    );

    await user.type(screen.getByPlaceholderText(/production/i), "Prod");
    await user.click(screen.getByRole("button", { name: /generate token/i }));

    await waitFor(() =>
      expect(screen.getByText(/copy your token now/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("pbt_secret123")).toBeInTheDocument();
  });
});
