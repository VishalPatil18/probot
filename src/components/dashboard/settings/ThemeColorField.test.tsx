import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ThemeColorField } from "./ThemeColorField";

describe("ThemeColorField", () => {
  it("renders the preset swatches inline with no popover", () => {
    render(<ThemeColorField value="#7c5cff" onChange={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /theme color #16a34a/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/custom theme color picker/i)).toBeInTheDocument();
  });

  it("marks the active preset as pressed", () => {
    render(<ThemeColorField value="#16a34a" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: /theme color #16a34a/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("emits the chosen preset on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ThemeColorField value="#7c5cff" onChange={onChange} />);
    await user.click(
      screen.getByRole("button", { name: /theme color #16a34a/i }),
    );
    expect(onChange).toHaveBeenCalledWith("#16a34a");
  });
});
