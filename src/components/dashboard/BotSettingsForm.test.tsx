import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

import { BotSettingsForm } from "./BotSettingsForm";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const baseProps = {
  botId: BOT_ID,
  initialName: "Jane Doe",
  initialHeadline: "ML Engineer",
  initialPersonality: "professional" as const,
  initialSuggestedQuestions: ["What are her skills?"],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("BotSettingsForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    routerRefreshMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the initial values in each control", () => {
    render(<BotSettingsForm {...baseProps} />);
    expect(screen.getByLabelText(/name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/headline/i)).toHaveValue("ML Engineer");
    expect(screen.getByText("What are her skills?")).toBeInTheDocument();
  });

  it("Save button is disabled when nothing has changed", () => {
    render(<BotSettingsForm {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeDisabled();
  });

  it("PATCHes only the changed fields (diff-based body)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotSettingsForm {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: "Sr. ML Engineer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/bots/${BOT_ID}`);
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ headline: "Sr. ML Engineer" });
    // name + personality + suggestedQuestions were NOT changed, so they
    // are not in the patch body.
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("personality");
    expect(body).not.toHaveProperty("suggestedQuestions");
  });

  it("shows 'Saved!' transient and calls router.refresh on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotSettingsForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText(/saved!/i)).toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("blocks submit + shows error when name is whitespace-only", async () => {
    render(<BotSettingsForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/name is required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders an inline error on 4xx server response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "validation_failed" }),
    );
    render(<BotSettingsForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't save/i,
    );
  });

  it("renders the personality cards and switches selection on click", () => {
    render(<BotSettingsForm {...baseProps} />);
    const creativeCard = screen.getByText("Creative").closest("label");
    if (!creativeCard) throw new Error("creative card not found");
    fireEvent.click(creativeCard);
    // Save button becomes enabled because personality changed
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).not.toBeDisabled();
  });
});
