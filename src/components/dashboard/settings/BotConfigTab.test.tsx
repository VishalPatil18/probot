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
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

import { BotConfigTab } from "./BotConfigTab";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

const baseProps = {
  botId: BOT_ID,
  ownerUsername: "jane-doe",
  initialImage: null,
  initialName: "Jane Doe",
  initialHeadline: "ML Engineer",
  initialPersonality: "professional" as const,
  initialSuggestedQuestions: ["What are her skills?"],
  initialIsActive: true,
  initialThemeColor: "#7c5cff",
  initialCustomInstructions: "",
  previewToken: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Each editable card now has its own subtle "Save" button. Scope queries to a
// section by its heading so the right per-section button is targeted.
function sectionByHeading(re: RegExp): HTMLElement {
  const heading = screen.getByRole("heading", { name: re });
  const section = heading.closest("section");
  if (!section) throw new Error(`section for ${re} not found`);
  return section as HTMLElement;
}

function saveButtonIn(re: RegExp): HTMLElement {
  return within(sectionByHeading(re)).getByRole("button", { name: /^save$/i });
}

describe("BotConfigTab", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    routerRefreshMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders initial values in each control", () => {
    render(<BotConfigTab {...baseProps} />);
    expect(screen.getByLabelText(/bot name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/headline/i)).toHaveValue("ML Engineer");
    expect(screen.getByText("What are her skills?")).toBeInTheDocument();
  });

  it("each section's Save button is disabled when nothing has changed", () => {
    render(<BotConfigTab {...baseProps} />);
    expect(saveButtonIn(/bot status/i)).toBeDisabled();
    expect(saveButtonIn(/personality/i)).toBeDisabled();
    expect(saveButtonIn(/rate limits/i)).toBeDisabled();
    expect(saveButtonIn(/suggested questions/i)).toBeDisabled();
  });

  it("PATCHes only the changed identity fields (diff-based body)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotConfigTab {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: "Sr. ML Engineer" },
    });
    fireEvent.click(saveButtonIn(/bot status/i));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/bots/${BOT_ID}`);
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ headline: "Sr. ML Engineer" });
  });

  it("auto-saves isActive=false immediately when the status toggle is clicked off", async () => {
    // The status toggle saves on its own - no Save button needed.
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    render(<BotConfigTab {...baseProps} />);
    fireEvent.click(screen.getByRole("switch", { name: /bot status/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/bots/${BOT_ID}`);
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ isActive: false });
  });

  it("shows 'Saved' transient and calls router.refresh on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotConfigTab {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: "Updated" },
    });
    fireEvent.click(saveButtonIn(/bot status/i));
    expect(
      await within(sectionByHeading(/bot status/i)).findByText(/saved/i),
    ).toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("blocks submit + shows inline error when name is whitespace-only", async () => {
    render(<BotConfigTab {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/bot name/i), {
      target: { value: "   " },
    });
    fireEvent.click(saveButtonIn(/bot status/i));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /bot name is required/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders inline error on 4xx server response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "validation_failed" }),
    );
    render(<BotConfigTab {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/headline/i), {
      target: { value: "x" },
    });
    fireEvent.click(saveButtonIn(/bot status/i));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
  });

  it("switches personality on radio card click and enables its Save button", () => {
    render(<BotConfigTab {...baseProps} />);
    const creativeCard = screen.getByText("Creative").closest("label");
    if (!creativeCard) throw new Error("creative card not found");
    fireEvent.click(creativeCard);
    expect(saveButtonIn(/personality/i)).not.toBeDisabled();
  });

  it("custom instructions textarea is enabled and sends customInstructions on PATCH", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotConfigTab {...baseProps} />);
    const textarea = screen.getByLabelText(/custom instructions/i);
    expect(textarea).not.toBeDisabled();
    fireEvent.change(textarea, {
      target: { value: "Always reply in lowercase." },
    });
    fireEvent.click(saveButtonIn(/personality/i));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ customInstructions: "Always reply in lowercase." });
  });

  it("draft bot with previewToken shows the Publish banner", () => {
    render(
      <BotConfigTab
        {...baseProps}
        initialIsActive={false}
        previewToken="abcdef.sig"
      />,
    );
    expect(screen.getByText(/draft - not yet live/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /publish bot/i }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open private preview/i });
    expect(link).toHaveAttribute(
      "href",
      "/u/jane-doe/chat?preview=abcdef.sig",
    );
  });

  it("publish button POSTs to /api/bots/[botId]/publish", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(
      <BotConfigTab
        {...baseProps}
        initialIsActive={false}
        previewToken="abcdef.sig"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /publish bot/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/bots/${BOT_ID}/publish`);
    expect(init.method).toBe("POST");
  });

  it("clicking a theme preset swatch enables Save and sends the new color on PATCH", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bot: {} }));
    render(<BotConfigTab {...baseProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /theme color #16a34a/i }),
    );
    expect(saveButtonIn(/personality/i)).not.toBeDisabled();
    fireEvent.click(saveButtonIn(/personality/i));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ themeColor: "#16a34a" });
  });
});
