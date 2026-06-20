import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { NotificationBell } from "./NotificationBell";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NotificationBell", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the bell with no badge when unread count is 0", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { count: 0 }));
    render(<NotificationBell />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(
      screen.getByRole("button", { name: /^notifications$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("9+")).toBeNull();
  });

  it("renders the unread count badge from the initial fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { count: 3 }));
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /3 unread/i }),
    ).toBeInTheDocument();
  });

  it("renders '9+' when unread count is >= 10", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { count: 47 }));
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  it("polls the unread-count endpoint every 30s while visible", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { count: 1 }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<NotificationBell />);
      // shouldAdvanceTime lets real waitFor still progress while the fake
      // setInterval can be advanced manually.
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the dropdown when the bell is clicked", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { count: 1 }))
      .mockResolvedValueOnce(
        jsonResponse(200, { items: [], total: 0, unreadCount: 0 }),
      );
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /1 unread/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /notifications/i }),
      ).toBeInTheDocument();
    });
  });

  it("closes the dropdown on ESC", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { count: 1 }))
      .mockResolvedValueOnce(
        jsonResponse(200, { items: [], total: 0, unreadCount: 0 }),
      );
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /1 unread/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /notifications/i }),
      ).toBeInTheDocument();
    });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /notifications/i }),
      ).toBeNull();
    });
  });
});
