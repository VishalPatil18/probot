// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { ThemeColorPicker } from "./ThemeColorPicker";

const fetchMock = vi.fn();

describe("ThemeColorPicker", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders both the color and hex inputs pre-filled with initialColor", () => {
    render(<ThemeColorPicker botId="bot-1" initialColor="#7c5cff" />);
    const text = screen.getByLabelText(/Theme color hex value/i);
    expect((text as HTMLInputElement).value).toBe("#7c5cff");
  });

  it("disables the Save button when the color is unchanged", () => {
    render(<ThemeColorPicker botId="bot-1" initialColor="#7c5cff" />);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  it("enables Save once the user changes the hex input", async () => {
    const user = userEvent.setup();
    render(<ThemeColorPicker botId="bot-1" initialColor="#7c5cff" />);
    const text = screen.getByLabelText(/Theme color hex value/i);
    await user.clear(text);
    await user.type(text, "#ff00aa");
    expect(screen.getByRole("button", { name: /Save/i })).not.toBeDisabled();
  });

  it("PATCHes /api/bots/[botId] with themeColor on Save", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ bot: { themeColor: "#ff00aa" } }), {
        status: 200,
      }),
    );
    const user = userEvent.setup();
    render(<ThemeColorPicker botId="bot-xyz" initialColor="#7c5cff" />);
    const text = screen.getByLabelText(/Theme color hex value/i);
    await user.clear(text);
    await user.type(text, "#ff00aa");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bots/bot-xyz",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeColor: "#ff00aa" }),
        }),
      );
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  it("blocks the PATCH and shows an error when hex is invalid", async () => {
    const user = userEvent.setup();
    render(<ThemeColorPicker botId="bot-xyz" initialColor="#7c5cff" />);
    const text = screen.getByLabelText(/Theme color hex value/i);
    await user.clear(text);
    await user.type(text, "#nope");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/valid #RRGGBB color/i);
  });

  it("shows a server-side failure message when the PATCH returns 4xx", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "validation_failed" }), {
        status: 400,
      }),
    );
    const user = userEvent.setup();
    render(<ThemeColorPicker botId="bot-xyz" initialColor="#7c5cff" />);
    const text = screen.getByLabelText(/Theme color hex value/i);
    await user.clear(text);
    await user.type(text, "#ff00aa");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not save/i);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
