import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ThemeColorField } from "./ThemeColorField";

describe("ThemeColorField", () => {
  it("shows the current color and hides the popover until clicked", () => {
    render(<ThemeColorField value="#7c5cff" onChange={() => {}} />);
    expect(screen.getByText("#7c5cff")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the popover and emits a preset on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ThemeColorField value="#7c5cff" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /theme color/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /theme color #10a37f/i }),
    );
    expect(onChange).toHaveBeenCalledWith("#10a37f");
  });

  it("closes the popover on Escape", async () => {
    const user = userEvent.setup();
    render(<ThemeColorField value="#7c5cff" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /theme color/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
