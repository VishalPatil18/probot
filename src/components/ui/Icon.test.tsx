import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders an inline svg (no icon font / network request)", () => {
    const { container } = render(<Icon name="menu" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Sized in em + currentColor so it inherits font-size and text color like
    // the old font glyph did.
    expect(svg?.getAttribute("width")).toBe("1em");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("passes through sizing/color utility classes", () => {
    const { container } = render(<Icon name="play_circle" className="!text-lg" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain(
      "!text-lg",
    );
  });

  it("renders different paths for different icon names", () => {
    const { container: a } = render(<Icon name="code" />);
    const { container: b } = render(<Icon name="public" />);
    expect(a.querySelector("svg")?.innerHTML).not.toBe(
      b.querySelector("svg")?.innerHTML,
    );
  });
});
