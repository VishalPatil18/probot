import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock, push: vi.fn() }),
}));

import { BotAdvancedTab } from "./BotAdvancedTab";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

const baseProps = {
  botId: BOT_ID,
  botName: "Jane Doe",
  initialName: "Jane Doe",
  initialHeadline: "ML Engineer",
  initialPersonality: "professional" as const,
  initialSuggestedQuestions: ["What are her skills?"],
  initialThemeColor: "#7c5cff",
  initialCustomInstructions: "",
  initialRateLimitPerMinute: null,
  initialRateLimitPerDay: null,
  initialRateLimitMaxChars: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sectionByHeading(re: RegExp): HTMLElement {
  const heading = screen.getByRole("heading", { name: re });
  const section = heading.closest("section");
  if (!section) throw new Error(`section for ${re} not found`);
  return section as HTMLElement;
}

function saveButtonIn(re: RegExp): HTMLElement {
  return within(sectionByHeading(re)).getByRole("button", { name: /save/i });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  routerRefreshMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BotAdvancedTab", () => {
  it("renders rate limits, preset, and danger zone sections", () => {
    render(<BotAdvancedTab {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: /rate limits/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /save as a preset/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /danger zone/i }),
    ).toBeInTheDocument();
  });

  it("rate-limit field sends a numeric override; blank means revert to default (null)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotAdvancedTab {...baseProps} initialRateLimitPerMinute={20} />);
    const perMinute = screen.getByLabelText(/per minute/i);
    fireEvent.change(perMinute, { target: { value: "" } });
    fireEvent.click(saveButtonIn(/rate limits/i));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(body).toEqual({ rateLimitPerMinute: null });
  });

  it("preset button POSTs a snapshot to /api/bot-presets", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "preset-1" }));
    render(<BotAdvancedTab {...baseProps} />);
    fireEvent.click(
      within(sectionByHeading(/save as a preset/i)).getByRole("button", {
        name: /save as preset/i,
      }),
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bot-presets",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
