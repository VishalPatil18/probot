import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DemoVideoModal } from "./DemoVideoModal";

// NEXT_PUBLIC_DEMO_VIDEO_URL is unset in the test env, so VIDEO_URL resolves to
// "" and the modal renders the "coming soon" poster rather than an iframe.
describe("DemoVideoModal", () => {
  it("is closed until the trigger is clicked", () => {
    render(<DemoVideoModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the poster and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<DemoVideoModal />);

    await user.click(screen.getByRole("button", { name: /see a live demo/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/demo coming soon/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see a live bot/i })).toHaveAttribute(
      "href",
      "/u/vishal/chat",
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on the close button", async () => {
    const user = userEvent.setup();
    render(<DemoVideoModal />);

    await user.click(screen.getByRole("button", { name: /see a live demo/i }));
    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
