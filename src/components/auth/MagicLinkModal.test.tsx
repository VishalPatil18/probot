import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

import { MagicLinkModal } from "./MagicLinkModal";

describe("MagicLinkModal", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("renders nothing when closed", () => {
    render(<MagicLinkModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends the link and shows the email in the confirmation", async () => {
    signInMock.mockResolvedValueOnce({ ok: true, error: null });
    const user = userEvent.setup();
    render(
      <MagicLinkModal
        open
        onClose={() => {}}
        initialEmail="jane@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(signInMock).toHaveBeenCalledWith("email", {
      email: "jane@example.com",
      callbackUrl: "/dashboard",
      redirect: false,
    });
    const confirmation = await screen.findByText(/sent a sign-in link/i);
    expect(confirmation).toHaveTextContent("jane@example.com");
  });

  it("blocks submit and shows an error for an invalid email", async () => {
    const user = userEvent.setup();
    render(<MagicLinkModal open onClose={() => {}} initialEmail="not-email" />);

    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    expect(signInMock).not.toHaveBeenCalled();
  });
});
