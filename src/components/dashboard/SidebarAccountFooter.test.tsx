import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

import { SidebarAccountFooter } from "./SidebarAccountFooter";

const USER = { name: "Jane Doe", email: "jane@example.com", initials: "JD" };

describe("SidebarAccountFooter", () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it("shows the profile row and no confirm dialog initially", () => {
    render(
      <SidebarAccountFooter
        llmProvider={null}
        llmModel={null}
        user={USER}
        settingsHref="/dashboard/settings"
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens an inline confirm panel and cancels back", async () => {
    const user = userEvent.setup();
    render(
      <SidebarAccountFooter
        llmProvider={null}
        llmModel={null}
        user={USER}
        settingsHref="/dashboard/settings"
      />,
    );

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    const dialog = screen.getByRole("dialog", { name: /confirm sign out/i });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("calls signOut with the login callback on confirm", async () => {
    const user = userEvent.setup();
    render(
      <SidebarAccountFooter
        llmProvider={null}
        llmModel={null}
        user={USER}
        settingsHref="/dashboard/settings"
      />,
    );

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    const dialog = screen.getByRole("dialog", { name: /confirm sign out/i });
    await user.click(within(dialog).getByRole("button", { name: /^sign out$/i }));

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
