import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { SelfHostedDangerZone } from "./SelfHostedDangerZone";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const baseProps = {
  botId: BOT_ID,
  botName: "Jane Doe",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

describe("SelfHostedDangerZone", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes the bot only after the name + phrase are confirmed, then routes to the dashboard", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const user = userEvent.setup();
    render(<SelfHostedDangerZone {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /delete this bot/i }));

    const confirmBtn = screen.getByRole("button", { name: /^delete bot$/i });
    expect(confirmBtn).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/type the bot's name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/to confirm/i), "delete this bot");

    expect(confirmBtn).toBeEnabled();
    await user.click(confirmBtn);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/bots/${BOT_ID}`);
    expect(init.method).toBe("DELETE");
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("surfaces an error and does not route when the delete request fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    const user = userEvent.setup();
    render(<SelfHostedDangerZone {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /delete this bot/i }));
    await user.type(screen.getByLabelText(/type the bot's name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/to confirm/i), "delete this bot");
    await user.click(screen.getByRole("button", { name: /^delete bot$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't delete/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
