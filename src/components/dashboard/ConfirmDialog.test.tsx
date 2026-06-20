import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Delete?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title + body + default labels when open", () => {
    render(
      <ConfirmDialog
        open
        title="Delete resume.pdf?"
        body="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete resume.pdf?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });

  it("fires onConfirm when the confirm button is clicked", () => {
    render(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("fires onCancel when the cancel button is clicked", () => {
    render(
      <ConfirmDialog
        open
        title="Delete?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel on ESC keydown", () => {
    render(
      <ConfirmDialog
        open
        title="Delete?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel on backdrop click but not on inner-panel click", () => {
    render(
      <ConfirmDialog
        open
        title="Delete?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    // Inner panel: clicking the title text shouldn't cancel
    fireEvent.click(screen.getByText("Delete?"));
    expect(onCancel).not.toHaveBeenCalled();
    // Backdrop click: fires onCancel
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("applies destructive styling (rose background) to the confirm button when destructive=true", () => {
    render(
      <ConfirmDialog
        open
        title="Delete?"
        destructive
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const confirmBtn = screen.getByRole("button", { name: /delete/i });
    expect(confirmBtn.className).toContain("rose");
  });
});
