import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getApiKeyMock = vi.fn();
const getAzureCredsMock = vi.fn();
const getSessionIdMock = vi.fn();
const fetchMock = vi.fn();

const STABLE_SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@/lib/client/llm-key-store", () => ({
  getApiKey: () => getApiKeyMock(),
  getAzureCreds: () => getAzureCredsMock(),
}));

vi.mock("@/lib/client/session-id-store", () => ({
  getOrCreateSessionId: () => getSessionIdMock(),
}));

// Stateful mock so writeLeadCaptureState("dismissed") flows through to the
// next readLeadCaptureState call - matches the real sessionStorage
// semantics that ChatWindow relies on for "card stays dismissed after the
// next reply" behavior.
const leadCaptureState = new Map<string, string>();
vi.mock("@/lib/client/lead-capture-state", () => ({
  readLeadCaptureState: (botId: string, sessionId: string) =>
    leadCaptureState.get(`${botId}:${sessionId}`) ?? "pending",
  writeLeadCaptureState: (botId: string, sessionId: string, status: string) => {
    leadCaptureState.set(`${botId}:${sessionId}`, status);
  },
}));

import { ChatWindow } from "./ChatWindow";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const defaultProps = {
  botId: "bot-123",
  botName: "Jane Doe",
  botHeadline: "ML Engineer",
  suggestedQuestions: ["What are her top skills?", "Is she remote-friendly?"],
  loadingMessages: ["Thinking…"],
  llmProvider: "anthropic" as const,
};

describe("ChatWindow", () => {
  beforeEach(() => {
    getApiKeyMock.mockReset();
    getAzureCredsMock.mockReset();
    getSessionIdMock.mockReset().mockReturnValue(STABLE_SESSION_ID);
    fetchMock.mockReset();
    leadCaptureState.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the bot header and the intro bubble + suggested questions on first mount", () => {
    getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
    render(<ChatWindow {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: /jane doe/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /what are her top skills/i }),
    ).toBeInTheDocument();
  });

  it("sends the x-llm-api-key header and never includes the key in the body", async () => {
    getApiKeyMock.mockReturnValue("sk-ant-leak-canary-9876543210");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { reply: "Hi!" }));
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.type(screen.getByRole("textbox"), "tell me about her");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/chat/bot-123");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-llm-api-key"]).toBe("sk-ant-leak-canary-9876543210");
    expect(init.body).not.toContain("sk-ant-leak-canary");
    const parsedBody = JSON.parse(init.body as string) as Record<
      string,
      unknown
    >;
    expect(parsedBody).toEqual({
      message: "tell me about her",
      sessionId: STABLE_SESSION_ID,
    });
  });

  it("includes the per-tab sessionId from the session-id store on every chat request", async () => {
    getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
    fetchMock.mockResolvedValue(jsonResponse(200, { reply: "ok" }));
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.type(screen.getByRole("textbox"), "first turn");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await user.type(screen.getByRole("textbox"), "second turn");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Slice 6.4: sessionId is memoized in a ref at mount, so the store
    // helper is called exactly once per ChatWindow instance. The same
    // sessionId then rides every request.
    expect(getSessionIdMock).toHaveBeenCalledTimes(1);
    const bodies = fetchMock.mock.calls.map((call) => {
      const [, init] = call as [string, RequestInit];
      return JSON.parse(init.body as string) as { sessionId: string };
    });
    expect(bodies[0]?.sessionId).toBe(STABLE_SESSION_ID);
    expect(bodies[1]?.sessionId).toBe(STABLE_SESSION_ID);
  });

  it("renders the assistant reply on a 200 and removes the suggestion strip", async () => {
    getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { reply: "Her top skills are Python, ML, and RAG." }),
    );
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /what are her top skills/i }),
    );

    expect(await screen.findByText(/python, ml, and rag/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /what are her top skills/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the rate-limit sentinel on a 429", async () => {
    getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
    fetchMock.mockResolvedValueOnce(jsonResponse(429, { error: "rate_limit" }));
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.type(screen.getByRole("textbox"), "go");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/slow down/i)).toBeInTheDocument();
  });

  it("shows the missing-key alert and does NOT call fetch when no key is set", async () => {
    getApiKeyMock.mockReturnValue(null);
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.type(screen.getByRole("textbox"), "go");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no api key/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a generic error message on a non-2xx / non-429 response", async () => {
    getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.type(screen.getByRole("textbox"), "go");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/something went wrong on my end/i),
    ).toBeInTheDocument();
  });

  it("falls back to a network-error message when fetch rejects", async () => {
    getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} />);

    await user.type(screen.getByRole("textbox"), "go");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it("Azure: sends x-llm-api-key + x-llm-azure-endpoint + x-llm-azure-api-version headers and no creds in body", async () => {
    getApiKeyMock.mockReturnValue("azure-leak-canary-9876543210");
    getAzureCredsMock.mockReturnValue({
      endpoint: "https://example.cognitiveservices.azure.com",
      apiVersion: "2025-01-01-preview",
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { reply: "Hi!" }));
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} llmProvider="azure" />);

    await user.type(screen.getByRole("textbox"), "hi");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["x-llm-api-key"]).toBe("azure-leak-canary-9876543210");
    expect(headers["x-llm-azure-endpoint"]).toBe(
      "https://example.cognitiveservices.azure.com",
    );
    expect(headers["x-llm-azure-api-version"]).toBe("2025-01-01-preview");
    // Neither the key nor the endpoint should appear in the JSON body.
    expect(init.body).not.toContain("azure-leak-canary");
    expect(init.body).not.toContain("cognitiveservices.azure.com");
  });

  it("Azure: shows missing-key alert and does NOT fetch when Azure creds are absent", async () => {
    getApiKeyMock.mockReturnValue("sk-some-key-1234567890");
    getAzureCredsMock.mockReturnValue(null);
    const user = userEvent.setup();
    render(<ChatWindow {...defaultProps} llmProvider="azure" />);

    await user.type(screen.getByRole("textbox"), "hi");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no api key/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Stage 6 §6.2: lead-capture card appears after the 3rd assistant reply.
  describe("lead capture card (Stage 6)", () => {
    async function sendN(turns: number) {
      const user = userEvent.setup();
      for (let i = 1; i <= turns; i++) {
        fetchMock.mockResolvedValueOnce(
          jsonResponse(200, {
            reply: `reply ${i}`,
            conversationId: "conv-xyz",
          }),
        );
        await user.type(screen.getByRole("textbox"), `q${i}`);
        await user.click(screen.getByRole("button", { name: /send message/i }));
      }
    }

    it("does NOT show the card after 1 or 2 assistant replies", async () => {
      getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
      render(<ChatWindow {...defaultProps} />);
      await sendN(2);
      expect(
        screen.queryByText(/want jane doe to get back to you/i),
      ).toBeNull();
    });

    it("shows the card inline after the 3rd assistant reply", async () => {
      getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
      render(<ChatWindow {...defaultProps} />);
      await sendN(3);
      expect(
        await screen.findByText(/want jane doe to get back to you/i),
      ).toBeInTheDocument();
    });

    it("removes the card when Skip is clicked and does not re-show on the next reply", async () => {
      getApiKeyMock.mockReturnValue("sk-ant-test-1234567890");
      const user = userEvent.setup();
      render(<ChatWindow {...defaultProps} />);
      await sendN(3);
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(
        screen.queryByText(/want jane doe to get back to you/i),
      ).toBeNull();
      // Subsequent reply must NOT bring the card back (handled by the
      // `messages.some(role === "system")` guard in shouldShowLeadCard,
      // but defense-in-depth via writeLeadCaptureState("dismissed").)
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { reply: "reply 4", conversationId: "conv-xyz" }),
      );
      await user.type(screen.getByRole("textbox"), "q4");
      await user.click(screen.getByRole("button", { name: /send message/i }));
      expect(
        screen.queryByText(/want jane doe to get back to you/i),
      ).toBeNull();
    });
  });
});
