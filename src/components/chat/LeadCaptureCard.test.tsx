import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LeadCaptureCard } from "./LeadCaptureCard";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";

const baseProps = {
  botId: BOT_ID,
  botName: "Jane Doe",
  conversationId: CONV_ID,
  contextSummary: "asked about ML",
  onDismiss: vi.fn(),
  onCaptured: vi.fn(),
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fillRequired(
  user: ReturnType<typeof userEvent.setup>,
  email = "rec@example.com",
) {
  await user.type(screen.getByLabelText(/your name/i), "Rec Ruiter");
  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^company$/i), "Acme Inc");
}

describe("LeadCaptureCard", () => {
  beforeEach(() => {
    baseProps.onDismiss = vi.fn();
    baseProps.onCaptured = vi.fn();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders prompt with the bot name", () => {
    render(<LeadCaptureCard {...baseProps} />);
    expect(
      screen.getByText(/want jane doe to get back to you/i),
    ).toBeInTheDocument();
  });

  it("shows an inline error on invalid email and does not POST", async () => {
    const user = userEvent.setup();
    const { container } = render(<LeadCaptureCard {...baseProps} />);
    await user.type(screen.getByLabelText(/your name/i), "Rec Ruiter");
    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/^company$/i), "Acme Inc");
    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
    expect(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls,
    ).toHaveLength(0);
  });

  it("POSTs name + email + company + conversationId + contextSummary on valid submit", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(201, { lead: { id: "lead-1" }, deduped: false }),
    );
    const user = userEvent.setup();
    render(<LeadCaptureCard {...baseProps} />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/bots/${BOT_ID}/leads`);
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.name).toBe("Rec Ruiter");
    expect(body.email).toBe("rec@example.com");
    expect(body.company).toBe("Acme Inc");
    expect(body.conversationId).toBe(CONV_ID);
    expect(body.contextSummary).toBe("asked about ML");
  });

  it("renders the 'Thanks!' confirmation after a successful submit and calls onCaptured", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, { lead: { id: "lead-1" }, deduped: true }),
    );
    const onCaptured = vi.fn();
    const user = userEvent.setup();
    render(<LeadCaptureCard {...baseProps} onCaptured={onCaptured} />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(
      await screen.findByText(/thanks! jane doe will be in touch/i),
    ).toBeInTheDocument();
    expect(onCaptured).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when Skip is clicked", () => {
    const onDismiss = vi.fn();
    render(<LeadCaptureCard {...baseProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders an error message and stays editable on 4xx server response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(400, { error: "validation_failed" }),
    );
    const user = userEvent.setup();
    render(<LeadCaptureCard {...baseProps} />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });

  it("omits conversationId from the POST body when null", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(201, { lead: { id: "lead-1" }, deduped: false }),
    );
    const user = userEvent.setup();
    render(<LeadCaptureCard {...baseProps} conversationId={null} />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.conversationId).toBeUndefined();
  });
});
