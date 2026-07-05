import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DemoVideoModal } from "./DemoVideoModal";

// The modal renders a native <video> (jsdom doesn't implement play(), which the
// component guards against) plus a mute/unmute toggle and a close button.
describe("DemoVideoModal", () => {
  it("is closed until the trigger is clicked", () => {
    render(<DemoVideoModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the video dialog and closes on Escape", async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoVideoModal />);

    await user.click(screen.getByRole("button", { name: /see a live demo/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(container.querySelector("video")).toBeInTheDocument();

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

  it("renders the video with native controls enabled", async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoVideoModal />);

    await user.click(screen.getByRole("button", { name: /see a live demo/i }));

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("controls");
  });
});
