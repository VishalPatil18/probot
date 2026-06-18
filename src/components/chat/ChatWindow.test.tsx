import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getApiKeyMock = vi.fn();
const getAzureCredsMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/client/llm-key-store", () => ({
  getApiKey: () => getApiKeyMock(),
  getAzureCreds: () => getAzureCredsMock(),
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
    fetchMock.mockReset();
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
    const parsedBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(parsedBody).toEqual({ message: "tell me about her" });
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

    expect(
      await screen.findByText(/python, ml, and rag/i),
    ).toBeInTheDocument();
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
});
