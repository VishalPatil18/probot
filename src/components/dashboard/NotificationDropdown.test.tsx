import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerPushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

import { NotificationDropdown } from "./NotificationDropdown";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const baseProps = {
  onClose: vi.fn(),
  onAllRead: vi.fn(),
  onItemRead: vi.fn(),
};

const SAMPLE_ITEMS = [
  {
    id: "n-1",
    kind: "lead_captured",
    payload: {
      leadId: "l-1",
      email: "rec@example.com",
      botId: "bot-1",
      botName: "Jane Doe",
      contextSummary: "asked about ML",
    },
    readAt: null,
    createdAt: new Date(Date.now() - 60 * 1000).toISOString(),
    botId: "bot-1",
  },
  {
    id: "n-2",
    kind: "lead_captured",
    payload: {
      leadId: "l-2",
      email: "old@example.com",
      botId: "bot-1",
      botName: "Jane Doe",
    },
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    botId: "bot-1",
  },
];

describe("NotificationDropdown", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    baseProps.onClose = vi.fn();
    baseProps.onAllRead = vi.fn();
    baseProps.onItemRead = vi.fn();
    routerPushMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows 'Loading…' while the initial fetch is in flight", () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<NotificationDropdown {...baseProps} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders the empty state when there are no notifications", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { items: [], total: 0, unreadCount: 0 }),
    );
    render(<NotificationDropdown {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });
  });

  it("renders items with email, context summary, and bot name", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: SAMPLE_ITEMS,
        total: 2,
        unreadCount: 1,
      }),
    );
    render(<NotificationDropdown {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("rec@example.com")).toBeInTheDocument();
    });
    expect(screen.getByText("asked about ML")).toBeInTheDocument();
    expect(screen.getAllByText(/jane doe/i).length).toBeGreaterThan(0);
  });

  it("marks the item read and navigates when clicked", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: SAMPLE_ITEMS,
          total: 2,
          unreadCount: 1,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "n-1", readAt: "..." }));
    render(<NotificationDropdown {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("rec@example.com")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /rec@example\.com/i }),
    );
    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        "/dashboard/bots/bot-1/leads",
      );
    });
    // Mark-read call was fired in parallel with navigation
    const calls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("/api/notifications/n-1/read");
    expect(baseProps.onItemRead).toHaveBeenCalledWith("n-1");
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("calls /api/notifications/read-all and onAllRead when 'Mark all read' is clicked", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: SAMPLE_ITEMS,
          total: 2,
          unreadCount: 1,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { markedRead: 1 }));
    render(<NotificationDropdown {...baseProps} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /mark all read/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    await waitFor(() => {
      expect(baseProps.onAllRead).toHaveBeenCalled();
    });
    const calls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("/api/notifications/read-all");
  });

  it("hides the 'Mark all read' button when there are no unread items", async () => {
    const allRead = SAMPLE_ITEMS.map((i) => ({
      ...i,
      readAt: new Date().toISOString(),
    }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { items: allRead, total: 2, unreadCount: 0 }),
    );
    render(<NotificationDropdown {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("rec@example.com")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /mark all read/i }),
    ).toBeNull();
  });

  it("renders an error state if the fetch fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    render(<NotificationDropdown {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
    });
  });
});
