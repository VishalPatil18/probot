import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KnowledgeTab } from "./KnowledgeTab";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SOURCES = [
  { name: "resume.pdf", sourceType: "pdf", chunkCount: 12, tokenCount: 9341 },
  { name: "linkedin.pdf", sourceType: "pdf", chunkCount: 8, tokenCount: 5210 },
];

describe("KnowledgeTab", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches sources on mount and renders each row with name + chunk count", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { sources: SOURCES, contextTokenCap: 12000 }),
    );
    render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(`/api/bots/${BOT_ID}/knowledge`);
    expect(screen.getByText(/12 chunks · indexed/)).toBeInTheDocument();
    expect(screen.getByText(/2 sources · 20 chunks indexed/i)).toBeInTheDocument();
  });

  it("renders 'No sources yet.' when the bot has no knowledge sources", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { sources: [], contextTokenCap: 12000 }),
    );
    render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/no sources yet/i)).toBeInTheDocument();
    });
  });

  it("opens the ConfirmDialog when Delete is clicked, then DELETE-calls the endpoint on confirm", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { sources: SOURCES, contextTokenCap: 12000 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { deleted: 1 }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          sources: [SOURCES[1]],
          contextTokenCap: 12000,
        }),
      );
    render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /delete "resume.pdf"/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0]);
      expect(urls).toContain(
        `/api/bots/${BOT_ID}/knowledge/sources/resume.pdf`,
      );
    });
  });

  it("Cancel on the ConfirmDialog closes the dialog and does NOT fire DELETE", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { sources: SOURCES, contextTokenCap: 12000 }),
    );
    render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /delete "resume.pdf"/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uploads a PDF via the file input (POSTs multipart to /knowledge)", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { sources: [], contextTokenCap: 12000 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { sources: [SOURCES[0]] }))
      .mockResolvedValueOnce(
        jsonResponse(200, { sources: [SOURCES[0]], contextTokenCap: 12000 }),
      );
    const { container } = render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/no sources yet/i)).toBeInTheDocument();
    });
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const pdf = new File(["pdf-bytes"], "newdoc.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [pdf] } });
    await waitFor(() => {
      const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(url).toBe(`/api/bots/${BOT_ID}/knowledge`);
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
    });
  });

  it("calls POST /knowledge/reprocess when 'Re-index all' is clicked", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { sources: SOURCES, contextTokenCap: 12000 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { totalTokens: 14551 }));
    render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /re-index all/i }));
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0]);
      expect(urls).toContain(`/api/bots/${BOT_ID}/knowledge/reprocess`);
    });
    expect(await screen.findByText(/14,551 tokens/)).toBeInTheDocument();
  });

  it("renders an error message when the initial fetch fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    render(<KnowledgeTab botId={BOT_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
    });
  });
});
