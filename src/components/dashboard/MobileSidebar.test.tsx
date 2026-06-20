import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

import {
  MobileSidebarPanel,
  MobileSidebarProvider,
  MobileSidebarToggle,
} from "./MobileSidebar";

function Harness({ panelChildren }: { panelChildren?: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <MobileSidebarToggle />
      <MobileSidebarPanel>
        {panelChildren ?? <p>Panel content</p>}
      </MobileSidebarPanel>
    </MobileSidebarProvider>
  );
}

describe("MobileSidebar - provider + toggle + panel", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    document.body.style.overflow = "";
  });

  it("renders the hamburger trigger and starts closed", () => {
    render(<Harness />);
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toBeInTheDocument();
    // Panel is closed → its content is not rendered
    expect(screen.queryByText("Panel content")).toBeNull();
  });

  it("opens the panel when the trigger is clicked", () => {
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the panel when the close button is clicked", () => {
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /close navigation menu/i }),
    );
    expect(screen.queryByText("Panel content")).toBeNull();
  });

  it("closes the panel on ESC keydown", () => {
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Panel content")).toBeNull();
  });

  it("closes the panel on backdrop click", () => {
    const { container } = render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    // The backdrop is the first absolutely-positioned div inside the dialog
    const backdrop = container.querySelector("div[aria-hidden]");
    if (!backdrop) throw new Error("backdrop not found");
    fireEvent.click(backdrop);
    expect(screen.queryByText("Panel content")).toBeNull();
  });

  it("locks body scroll while open and restores on close", () => {
    render(<Harness />);
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(
      screen.getByRole("button", { name: /close navigation menu/i }),
    );
    expect(document.body.style.overflow).toBe("");
  });
});
