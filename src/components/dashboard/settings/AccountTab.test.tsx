import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { AccountTab } from "./AccountTab";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const baseProps = {
  name: "Jane Doe",
  email: "jane@example.com",
  username: "jane-doe",
  image: null,
  initials: "JD",
};

describe("AccountTab", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the editable profile + password fields", () => {
    render(<AccountTab {...baseProps} />);
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/username/i)).toHaveValue("jane-doe");
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
  });

  it("PATCHes the profile when name changes and Save is clicked", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: {} }));
    const user = userEvent.setup();
    render(<AccountTab {...baseProps} />);

    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/me/profile",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body).toEqual({ name: "Jane Smith", username: "jane-doe" });
  });

  it("POSTs a password change and confirms success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const user = userEvent.setup();
    render(<AccountTab {...baseProps} />);

    await user.type(screen.getByLabelText("Current password"), "old-password");
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/me/password",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });
});
