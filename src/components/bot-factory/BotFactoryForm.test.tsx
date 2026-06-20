import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const setApiKeyMock = vi.fn();
const setAzureCredsMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/client/llm-key-store", () => ({
  setApiKey: (...args: unknown[]) => setApiKeyMock(...args),
  setAzureCreds: (...args: unknown[]) => setAzureCredsMock(...args),
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
    setAzureCredsMock.mockReset();
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

  it("renders Google as the only disabled provider with SOON badge (anthropic/openai/azure enabled)", async () => {
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);

    const google = screen.getByRole("button", { name: /Google/i });
    const azure = screen.getByRole("button", { name: /Azure/i });
    // `/^OpenAI/i` anchors to the start of the accessible name so it matches
    // only the OpenAI provider button - not Azure, whose family label also
    // contains "OpenAI" ("Azure / OpenAI").
    const openai = screen.getByRole("button", { name: /^OpenAI/i });
    expect(google).toBeDisabled();
    expect(azure).toBeEnabled();
    expect(openai).toBeEnabled();
    expect(within(google).getByText("SOON")).toBeInTheDocument();
  });

  it("Azure flow: shows endpoint + deployment + apiVersion fields, saves Azure creds, submits with deployment as llmModel", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, { bot: { id: "bot-1", name: "Jane Doe" } }),
    );
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);
    await fillStep2(user);
    await passStep3(user);

    await user.click(screen.getByRole("button", { name: /Azure/i }));

    await user.type(
      screen.getByLabelText(/azure endpoint/i),
      "https://example.cognitiveservices.azure.com",
    );
    await user.type(screen.getByLabelText(/deployment name/i), "gpt-4o-mini");
    await user.type(
      screen.getByLabelText(/azure api key/i),
      "azure-test-key-1234567890",
    );
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));

    expect(setApiKeyMock).toHaveBeenCalledWith("azure-test-key-1234567890");
    expect(setAzureCredsMock).toHaveBeenCalledWith({
      endpoint: "https://example.cognitiveservices.azure.com",
      apiVersion: "2025-01-01-preview",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.llmProvider).toBe("azure");
    expect(body.llmModel).toBe("gpt-4o-mini");
    // Defense-in-depth: neither the key nor the endpoint leak into the JSON body.
    expect(init.body).not.toContain("azure-test-key-1234567890");
    expect(init.body).not.toContain("cognitiveservices.azure.com");
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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /network error/i,
    );
  });

  it("Step 2 advances on PDF-only (no pasted text) and the file appears in the list", async () => {
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);

    const cont = screen.getByRole("button", { name: /continue/i });
    expect(cont).toBeDisabled();

    // Use the hidden file input directly; jsdom can't dispatch real drops.
    const fileInput = document.getElementById(
      "bf-pdf-input",
    ) as HTMLInputElement;
    const pdf = new File(["%PDF-1.4 demo"], "resume.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, pdf);

    expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    expect(cont).toBeEnabled();
  });

  it("Advanced disclosure exposes context_token_cap, default 12000, sent in /api/bots body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, { bot: { id: "bot-1", name: "Jane Doe" } }),
    );
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);

    await user.click(screen.getByRole("button", { name: /advanced/i }));
    const capInput = screen.getByLabelText(
      /context token cap/i,
    ) as HTMLInputElement;
    expect(capInput.value).toBe("12000");
    // Direct change event - bypasses user.type's per-keystroke clamping that
    // intermediate values would trigger for a controlled number input.
    fireEvent.change(capInput, { target: { value: "20000" } });

    await fillStep2(user);
    await passStep3(user);
    await fillStep4(user, "sk-ant-test-1234567890");
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.contextTokenCap).toBe(20000);
  });

  it("posts queued PDFs to /api/bots/:id/knowledge after /api/bots succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(201, { bot: { id: "bot-42", name: "Jane Doe" } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { sources: [] }));
    const user = userEvent.setup();
    render(<BotFactoryForm username="jane" />);
    await fillStep1(user);

    const fileInput = document.getElementById(
      "bf-pdf-input",
    ) as HTMLInputElement;
    const pdf = new File(["%PDF-1.4 cv"], "cv.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, pdf);
    // Also paste manual text to verify it's included in the multipart `text` field.
    await user.type(
      screen.getByLabelText(/bio \/ resume text/i),
      "manual bio text",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await passStep3(user);
    await fillStep4(user, "sk-ant-test-1234567890");
    await user.click(screen.getByRole("button", { name: /save & deploy/i }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const [url, secondInit] = secondCall;
    expect(url).toBe("/api/bots/bot-42/knowledge");
    expect(secondInit.method).toBe("POST");
    expect(secondInit.body).toBeInstanceOf(FormData);
    const fd = secondInit.body as FormData;
    expect(fd.get("text")).toBe("manual bio text");
    const files = fd.getAll("files");
    expect(files).toHaveLength(1);
    expect((files[0] as File).name).toBe("cv.pdf");
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
