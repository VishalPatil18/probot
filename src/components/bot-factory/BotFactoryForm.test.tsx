import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const setApiKeyMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/client/llm-key-store", () => ({
  setApiKey: (...args: unknown[]) => setApiKeyMock(...args),
}));

import { BotFactoryForm } from "./BotFactoryForm";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/display name/i), "Jane Doe");
  await user.type(screen.getByLabelText(/headline/i), "ML Engineer");
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(/bio \/ resume text/i),
    "I am an ML engineer with five years experience.",
  );
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function passStep3(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function fillStep4(
  user: ReturnType<typeof userEvent.setup>,
  apiKey: string,
) {
  await user.type(screen.getByLabelText(/anthropic api key/i), apiKey);
}

describe("BotFactoryForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    setApiKeyMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Step 1 (Identity) by default", () => {
    render(<BotFactoryForm username="jane" />);
    expect(
      screen.getByRole("heading", { name: /who is your bot/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("probot.com/u/")).toBeInTheDocument();
    expect(screen.getByText("jane")).toBeInTheDocument();
  });

  it("disables Continue until name is filled (Step 1 validation)", async () => {
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    const cont = screen.getByRole("button", { name: /continue/i });
    expect(cont).toBeDisabled();
    await user.type(screen.getByLabelText(/display name/i), "Jane Doe");
    expect(cont).toBeEnabled();
  });

  it("advances through Step 1 → Step 2 → Step 3 → Step 4", async () => {
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    expect(
      screen.getByRole("heading", { name: /feed it your career/i }),
    ).toBeInTheDocument();
    await fillStep2(user);
    expect(
      screen.getByRole("heading", { name: /give it a personality/i }),
    ).toBeInTheDocument();
    await passStep3(user);
    expect(
      screen.getByRole("heading", { name: /choose your ai model/i }),
    ).toBeInTheDocument();
  });

  it("renders Google + DeepSeek provider buttons as disabled with SOON badge", async () => {
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);

    const google = screen.getByRole("button", { name: /Google/i });
    const deepseek = screen.getByRole("button", { name: /DeepSeek/i });
    expect(google).toBeDisabled();
    expect(deepseek).toBeDisabled();
    expect(within(google).getByText("SOON")).toBeInTheDocument();
    expect(within(deepseek).getByText("SOON")).toBeInTheDocument();
  });

  it("submits to /api/bots with form payload, stashes apiKey locally, advances to Step 5", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, { bot: { id: "bot-1", name: "Jane Doe" } }),
    );
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);
    await fillStep4(user, "sk-ant-test-1234567890");
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));

    expect(setApiKeyMock).toHaveBeenCalledWith("sk-ant-test-1234567890");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/bots");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.name).toBe("Jane Doe");
    expect(body.llmProvider).toBe("anthropic");
    expect(body).not.toHaveProperty("apiKey");
    // Defense-in-depth: the key value must never appear in the request body.
    expect(init.body).not.toContain("sk-ant-test-1234567890");

    expect(
      await screen.findByRole("heading", { name: /ready to deploy/i }),
    ).toBeInTheDocument();
  });

  it("shows the server error message on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "Validation failed" }),
    );
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);
    await fillStep4(user, "sk-ant-test-1234567890");
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /validation failed/i,
    );
  });

  it("shows a network error message when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);
    await fillStep4(user, "sk-ant-test-1234567890");
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/network error/i);
  });

  it("navigates to /u/{username}/chat when Preview is clicked on Step 5", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, { bot: { id: "bot-1", name: "Jane Doe" } }),
    );
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);
    await fillStep4(user, "sk-ant-test-1234567890");
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));
    await screen.findByRole("heading", { name: /ready to deploy/i });
    await user.click(screen.getByRole("button", { name: /preview bot/i }));
    expect(pushMock).toHaveBeenCalledWith("/u/jane/chat");
  });
});
