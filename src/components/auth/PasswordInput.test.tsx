import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "./PasswordInput";

function Harness() {
  const [value, setValue] = useState("");
  return <PasswordInput id="pw" value={value} onChange={setValue} />;
}

describe("PasswordInput", () => {
  it("starts masked and toggles to visible and back", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = document.getElementById("pw") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("forwards typed input through onChange", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = document.getElementById("pw") as HTMLInputElement;
    await user.type(input, "secret123");
    expect(input).toHaveValue("secret123");
  });
});
