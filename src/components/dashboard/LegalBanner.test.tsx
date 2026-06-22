import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LegalBanner } from "./LegalBanner";

describe("LegalBanner", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the terms notice", () => {
    render(<LegalBanner />);
    expect(screen.getByText(/updated our terms/i)).toBeInTheDocument();
  });

  it("acknowledges and hides on dismiss", async () => {
    const user = userEvent.setup();
    render(<LegalBanner />);
    await user.click(screen.getByRole("button", { name: /got it/i }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/me/legal-ack",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.queryByText(/updated our terms/i)).not.toBeInTheDocument();
  });
});
