// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyUrlButton } from "./CopyUrlButton";

const writeTextMock = vi.fn();

describe("CopyUrlButton", () => {
  beforeEach(() => {
    writeTextMock.mockReset();
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('renders the default label "Copy link"', () => {
    render(<CopyUrlButton url="https://pro-bot.dev/u/jane/chat" />);
    expect(
      screen.getByRole("button", { name: /Copy link/i }),
    ).toBeInTheDocument();
  });

  it("writes the URL to the clipboard on click and shows Copied! feedback", async () => {
    writeTextMock.mockResolvedValueOnce(undefined);
    render(<CopyUrlButton url="https://pro-bot.dev/u/jane/chat" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy link/i }));
    });
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "https://pro-bot.dev/u/jane/chat",
      );
    });
    expect(
      await screen.findByRole("button", { name: /Copied!/i }),
    ).toBeInTheDocument();
  });

  it("shows fallback feedback when clipboard write fails", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("no permission"));
    render(<CopyUrlButton url="https://pro-bot.dev/u/jane/chat" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy link/i }));
    });
    expect(
      await screen.findByRole("button", { name: /Copy failed/i }),
    ).toBeInTheDocument();
  });

  it("uses a custom label when provided", () => {
    render(
      <CopyUrlButton url="https://pro-bot.dev/u/jane/chat" label="Share URL" />,
    );
    expect(
      screen.getByRole("button", { name: /Share URL/i }),
    ).toBeInTheDocument();
  });

  it("aria-label includes the URL and current state for screen readers", () => {
    render(<CopyUrlButton url="https://pro-bot.dev/u/jane/chat" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain(
      "https://pro-bot.dev/u/jane/chat",
    );
    expect(btn.getAttribute("aria-label")).toContain("Copy link");
  });
});
